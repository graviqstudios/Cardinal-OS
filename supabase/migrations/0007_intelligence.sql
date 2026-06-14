-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 5: Intelligence Layer.
--
-- Only `mock_exams` needs persistence (the user logs these). The timing insight,
-- burnout signal, panic mode, and predictive projection are all computed live
-- from existing practice_sessions + topics + readiness, so no session_logs /
-- cognitive_insights tables are created (they'd sit empty).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.mock_exams (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  label        text not null,
  score        numeric not null check (score >= 0),
  max_score    numeric not null check (max_score > 0),
  taken_at     date not null default (now() at time zone 'utc')::date,
  created_at   timestamptz not null default now()
);
create index if not exists mock_exams_user_idx on public.mock_exams (user_id, taken_at);

alter table public.mock_exams enable row level security;

drop policy if exists "owner_select" on public.mock_exams;
drop policy if exists "owner_insert" on public.mock_exams;
drop policy if exists "owner_delete" on public.mock_exams;

create policy "owner_select" on public.mock_exams for select using (auth.uid() = user_id);
create policy "owner_insert" on public.mock_exams for insert with check (auth.uid() = user_id);
create policy "owner_delete" on public.mock_exams for delete using (auth.uid() = user_id);
