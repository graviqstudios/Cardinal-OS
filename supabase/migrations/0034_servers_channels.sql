-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Constellations become Discord-style servers.
--
-- A constellation (still the `pods` table) gains server details (description,
-- public/private visibility, icon, member cap) and is organised into
-- categories → channels (text + voice). Messages move from per-pod to
-- per-channel. Existing pods are migrated to a default #general text channel +
-- a Study Room voice channel, with their history backfilled onto #general.
-- Channel/category management is owner-only; reading is member-only (public
-- discovery of the server row itself lands in 0035).
-- ════════════════════════════════════════════════════════════════════════════

-- ── extend the server (pods) row ─────────────────────────────────────────────
alter table public.pods add column if not exists description text;
alter table public.pods add column if not exists visibility text not null default 'private'
  check (visibility in ('public', 'private'));
alter table public.pods add column if not exists icon_url text;
alter table public.pods add column if not exists member_cap int not null default 100;

-- ── owner helper (SECURITY DEFINER → no RLS recursion) ───────────────────────
create or replace function public.is_pod_owner(p_pod uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.pods where id = p_pod and created_by = auth.uid()
  );
$$;

-- ── pods: owner may update/delete the server (0008 only had a select policy) ─
drop policy if exists "pods_update" on public.pods;
create policy "pods_update" on public.pods for update
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists "pods_delete" on public.pods;
create policy "pods_delete" on public.pods for delete
  using (created_by = auth.uid());

-- ── categories + channels ────────────────────────────────────────────────────
create table if not exists public.channel_categories (
  id          uuid primary key default gen_random_uuid(),
  pod_id      uuid not null references public.pods (id) on delete cascade,
  name        text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists channel_categories_pod_idx on public.channel_categories (pod_id);

create table if not exists public.channels (
  id           uuid primary key default gen_random_uuid(),
  pod_id       uuid not null references public.pods (id) on delete cascade,
  category_id  uuid references public.channel_categories (id) on delete set null,
  name         text not null,
  type         text not null default 'text' check (type in ('text', 'voice')),
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists channels_pod_idx on public.channels (pod_id);

-- ── messages become per-channel ──────────────────────────────────────────────
alter table public.constellation_messages
  add column if not exists channel_id uuid references public.channels (id) on delete cascade;
create index if not exists constellation_messages_channel_idx
  on public.constellation_messages (channel_id, created_at);

-- ── RLS: read = pod member; write (categories/channels) = pod owner ──────────
alter table public.channel_categories enable row level security;
alter table public.channels enable row level security;

do $$
declare t text;
begin
  foreach t in array array['channel_categories', 'channels']
  loop
    execute format('drop policy if exists "member_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);
    execute format($f$create policy "member_select" on public.%I for select using (public.is_pod_member(pod_id));$f$, t);
    execute format($f$create policy "owner_insert" on public.%I for insert with check (public.is_pod_owner(pod_id));$f$, t);
    execute format($f$create policy "owner_update" on public.%I for update using (public.is_pod_owner(pod_id)) with check (public.is_pod_owner(pod_id));$f$, t);
    execute format($f$create policy "owner_delete" on public.%I for delete using (public.is_pod_owner(pod_id));$f$, t);
  end loop;
end $$;

-- ── seed default channels for a pod (idempotent) ─────────────────────────────
create or replace function public.seed_pod_channels(p_pod uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_text_cat uuid; v_voice_cat uuid; v_general uuid;
begin
  if exists (select 1 from public.channels where pod_id = p_pod) then
    return;
  end if;

  insert into public.channel_categories (pod_id, name, position)
  values (p_pod, 'Text Channels', 0) returning id into v_text_cat;
  insert into public.channel_categories (pod_id, name, position)
  values (p_pod, 'Voice Channels', 1) returning id into v_voice_cat;

  insert into public.channels (pod_id, category_id, name, type, position)
  values (p_pod, v_text_cat, 'general', 'text', 0) returning id into v_general;
  insert into public.channels (pod_id, category_id, name, type, position)
  values (p_pod, v_voice_cat, 'Study Room', 'voice', 0);

  -- Backfill any pre-existing messages onto #general.
  update public.constellation_messages
  set channel_id = v_general
  where pod_id = p_pod and channel_id is null;
end;
$$;

-- ── create_pod now records details + seeds the default layout ────────────────
-- Drop the old 2-arg version so the new signature isn't left as an overload.
drop function if exists public.create_pod(text, text);
create or replace function public.create_pod(
  p_name text,
  p_exam text,
  p_description text default null,
  p_visibility text default 'private'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  v_code := substr(md5(gen_random_uuid()::text), 1, 8);
  insert into public.pods (name, exam_target, description, visibility, invite_code, created_by)
  values (
    p_name,
    nullif(p_exam, ''),
    nullif(p_description, ''),
    case when p_visibility = 'public' then 'public' else 'private' end,
    v_code,
    auth.uid()
  )
  returning id into v_id;
  insert into public.pod_members (pod_id, user_id) values (v_id, auth.uid());
  perform public.seed_pod_channels(v_id);
  return v_id;
end;
$$;

-- ── join_pod now respects each server's member_cap ───────────────────────────
create or replace function public.join_pod(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int; v_cap int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id, member_cap into v_id, v_cap from public.pods where invite_code = lower(trim(p_code));
  if v_id is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.pod_members where pod_id = v_id and user_id = auth.uid()) then
    return v_id;
  end if;
  select count(*) into v_count from public.pod_members where pod_id = v_id;
  if v_count >= coalesce(v_cap, 100) then raise exception 'This server is full.'; end if;
  insert into public.pod_members (pod_id, user_id) values (v_id, auth.uid());
  return v_id;
end;
$$;

grant execute on function public.create_pod(text, text, text, text) to authenticated;
grant execute on function public.seed_pod_channels(uuid) to authenticated;

-- ── migrate existing pods to the default layout + backfill messages ──────────
do $$
declare r record;
begin
  for r in select id from public.pods loop
    perform public.seed_pod_channels(r.id);
  end loop;
end $$;

-- ── Realtime: channels list changes (for live sidebar) ───────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.channels;
  exception when duplicate_object then null; end;
end $$;

-- ── Storage: private-ish server icons bucket (public-read, owner-write) ───────
insert into storage.buckets (id, name, public)
values ('server-icons', 'server-icons', true)
on conflict (id) do nothing;

drop policy if exists "server_icons_read" on storage.objects;
drop policy if exists "server_icons_insert" on storage.objects;
drop policy if exists "server_icons_delete" on storage.objects;
create policy "server_icons_read" on storage.objects for select
  using (bucket_id = 'server-icons');
create policy "server_icons_insert" on storage.objects for insert
  with check (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "server_icons_delete" on storage.objects for delete
  using (bucket_id = 'server-icons' and (storage.foldername(name))[1] = auth.uid()::text);
