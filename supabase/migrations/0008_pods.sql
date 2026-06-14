-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 6: Study Pods (Realtime) + Voice (reuses practice tables).
--
-- Pods need members to see each other's readiness/streak/goal, which the normal
-- per-user RLS blocks. Solution: a `pod_stats` table each user publishes their
-- OWN snapshot to, readable by anyone who shares a pod (via SECURITY DEFINER
-- helpers that don't recurse through RLS). Create/join go through RPCs that
-- enforce the 4–6 member cap.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  exam_target  text,
  invite_code  text not null unique,
  created_by   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.pod_members (
  id         uuid primary key default gen_random_uuid(),
  pod_id     uuid not null references public.pods (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (pod_id, user_id)
);
create index if not exists pod_members_pod_idx on public.pod_members (pod_id);
create index if not exists pod_members_user_idx on public.pod_members (user_id);

-- Each user's shareable snapshot (one row per user, shown across their pods).
create table if not exists public.pod_stats (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  name          text,
  readiness     int not null default 0,
  streak        int not null default 0,
  current_goal  text,
  updated_at    timestamptz not null default now()
);

-- ── SECURITY DEFINER helpers (bypass RLS → no policy recursion) ───────────────
create or replace function public.is_pod_member(p_pod uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.pod_members
    where pod_id = p_pod and user_id = auth.uid()
  );
$$;

create or replace function public.shares_pod(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.pod_members m1
    join public.pod_members m2 on m1.pod_id = m2.pod_id
    where m1.user_id = auth.uid() and m2.user_id = target
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.pods enable row level security;
alter table public.pod_members enable row level security;
alter table public.pod_stats enable row level security;

drop policy if exists "pods_select" on public.pods;
create policy "pods_select" on public.pods for select
  using (created_by = auth.uid() or public.is_pod_member(id));

drop policy if exists "pod_members_select" on public.pod_members;
create policy "pod_members_select" on public.pod_members for select
  using (public.is_pod_member(pod_id));
drop policy if exists "pod_members_insert" on public.pod_members;
create policy "pod_members_insert" on public.pod_members for insert
  with check (user_id = auth.uid());
drop policy if exists "pod_members_delete" on public.pod_members;
create policy "pod_members_delete" on public.pod_members for delete
  using (user_id = auth.uid());

drop policy if exists "pod_stats_select" on public.pod_stats;
create policy "pod_stats_select" on public.pod_stats for select
  using (user_id = auth.uid() or public.shares_pod(user_id));
drop policy if exists "pod_stats_upsert" on public.pod_stats;
create policy "pod_stats_upsert" on public.pod_stats for insert
  with check (user_id = auth.uid());
drop policy if exists "pod_stats_update" on public.pod_stats;
create policy "pod_stats_update" on public.pod_stats for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Create / join RPCs (enforce 4–6 cap) ─────────────────────────────────────
create or replace function public.create_pod(p_name text, p_exam text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  v_code := substr(md5(gen_random_uuid()::text), 1, 8);
  insert into public.pods (name, exam_target, invite_code, created_by)
  values (p_name, nullif(p_exam, ''), v_code, auth.uid())
  returning id into v_id;
  insert into public.pod_members (pod_id, user_id) values (v_id, auth.uid());
  return v_id;
end;
$$;

create or replace function public.join_pod(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id into v_id from public.pods where invite_code = lower(trim(p_code));
  if v_id is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.pod_members where pod_id = v_id and user_id = auth.uid()) then
    return v_id;
  end if;
  select count(*) into v_count from public.pod_members where pod_id = v_id;
  if v_count >= 6 then raise exception 'This pod is full (max 6 members).'; end if;
  insert into public.pod_members (pod_id, user_id) values (v_id, auth.uid());
  return v_id;
end;
$$;

grant execute on function public.create_pod(text, text) to authenticated;
grant execute on function public.join_pod(text) to authenticated;

-- ── Realtime: broadcast pod_stats + pod_members changes ──────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.pod_stats;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.pod_members;
  exception when duplicate_object then null; end;
end $$;
