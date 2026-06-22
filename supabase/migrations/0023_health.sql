-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Health (formerly Body) expansion. Adds mood/stress, hydration
-- and mindfulness to the daily metric, plus a light nutrition log and an opt-in
-- cycle log. All owner-RLS'd (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── profile: optional sex, drives whether cycle tracking is offered ──────────
alter table public.users
  add column if not exists sex text check (sex in ('female', 'male', 'other'));

-- ── extend the daily metric (one row per day, already unique on user_id,date) ─
alter table public.body_metrics
  add column if not exists mood_level          int check (mood_level between 1 and 5);
alter table public.body_metrics
  add column if not exists stress_level        int check (stress_level between 1 and 5);
alter table public.body_metrics
  add column if not exists water_ml            int check (water_ml >= 0);
alter table public.body_metrics
  add column if not exists mindfulness_minutes int check (mindfulness_minutes >= 0);

-- ── light nutrition log (free-form meals, optional quality/calories) ─────────
create table if not exists public.nutrition_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  label      text not null,
  quality    int check (quality between 1 and 5),
  calories   int check (calories >= 0),
  created_at timestamptz not null default now()
);
create index if not exists nutrition_logs_user_date_idx on public.nutrition_logs (user_id, date);

-- ── cycle log (opt-in; one row per logged day) ───────────────────────────────
create table if not exists public.period_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  flow       text check (flow in ('spotting', 'light', 'medium', 'heavy')),
  symptoms   text[],
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists period_logs_user_date_idx on public.period_logs (user_id, date);

-- ── RLS owner policies ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['nutrition_logs', 'period_logs']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);
    execute format($f$create policy "owner_select" on public.%I for select using (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);$f$, t);
  end loop;
end $$;
