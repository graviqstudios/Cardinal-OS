-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 2: Readiness Score daily snapshots.
--
-- One row per user per day (the day the score was last computed). The live score
-- is computed on demand from topics + practice; this table stores the daily
-- history that powers the trend arrow and the 14-day sparkline.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.readiness_scores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null default (now() at time zone 'utc')::date,
  score          int not null,
  breakdown      jsonb,
  calculated_at  timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists readiness_user_day_idx
  on public.readiness_scores (user_id, day desc);

alter table public.readiness_scores enable row level security;

drop policy if exists "owner_select" on public.readiness_scores;
drop policy if exists "owner_insert" on public.readiness_scores;
drop policy if exists "owner_update" on public.readiness_scores;

create policy "owner_select" on public.readiness_scores for select
  using (auth.uid() = user_id);
create policy "owner_insert" on public.readiness_scores for insert
  with check (auth.uid() = user_id);
create policy "owner_update" on public.readiness_scores for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
