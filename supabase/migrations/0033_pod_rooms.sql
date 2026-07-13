-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Constellation study rooms: shared timer state.
--
-- A constellation can run a live study room (presence + a synchronized timer +
-- free Jitsi video). Presence and the countdown are driven over Supabase
-- Realtime, but a single pod_timer row per pod persists the current timer so
-- late-joiners land on the right countdown. Only pod members can read/write it
-- (via the is_pod_member SECURITY DEFINER helper from 0008_pods.sql).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.pod_timer (
  pod_id      uuid primary key references public.pods (id) on delete cascade,
  ends_at     timestamptz,
  label       text,
  phase       text not null default 'focus' check (phase in ('focus', 'break')),
  started_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.pod_timer enable row level security;

drop policy if exists "member_select" on public.pod_timer;
drop policy if exists "member_insert" on public.pod_timer;
drop policy if exists "member_update" on public.pod_timer;
drop policy if exists "member_delete" on public.pod_timer;

create policy "member_select" on public.pod_timer
  for select using (public.is_pod_member(pod_id));
create policy "member_insert" on public.pod_timer
  for insert with check (public.is_pod_member(pod_id));
create policy "member_update" on public.pod_timer
  for update using (public.is_pod_member(pod_id)) with check (public.is_pod_member(pod_id));
create policy "member_delete" on public.pod_timer
  for delete using (public.is_pod_member(pod_id));

-- Broadcast timer changes to members in real time.
alter publication supabase_realtime add table public.pod_timer;
