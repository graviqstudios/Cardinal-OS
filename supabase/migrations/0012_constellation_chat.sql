-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Constellation chat (live messages for a shared group).
--
-- "Constellations" is the UI name for the existing `pods` group (the DB tables
-- keep their original names so RLS/RPC/Realtime stay intact). This adds a live
-- message stream scoped to a pod. Reuses the `is_pod_member()` SECURITY DEFINER
-- helper from 0008 so membership checks don't recurse through RLS.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.constellation_messages (
  id           uuid primary key default gen_random_uuid(),
  pod_id       uuid not null references public.pods (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  author_name  text,                       -- denormalised snapshot for display
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists constellation_messages_pod_idx
  on public.constellation_messages (pod_id, created_at);

-- ── RLS: only members of the pod may read or post ────────────────────────────
alter table public.constellation_messages enable row level security;

drop policy if exists "constellation_messages_select" on public.constellation_messages;
create policy "constellation_messages_select" on public.constellation_messages for select
  using (public.is_pod_member(pod_id));

drop policy if exists "constellation_messages_insert" on public.constellation_messages;
create policy "constellation_messages_insert" on public.constellation_messages for insert
  with check (user_id = auth.uid() and public.is_pod_member(pod_id));

-- ── Realtime: broadcast new messages ─────────────────────────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.constellation_messages;
  exception when duplicate_object then null; end;
end $$;
