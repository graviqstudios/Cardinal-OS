-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase D: Body (metrics + workouts) and the focus (Pomodoro)
-- engine. All owner-RLS'd (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── daily body metrics (one row per day) ─────────────────────────────────────
create table if not exists public.body_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          date not null,
  weight_kg     numeric,
  sleep_hours   numeric,
  energy_level  int check (energy_level between 1 and 5),
  notes         text,
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date);

-- ── workout logs (free-form; no separate library in v1) ──────────────────────
create table if not exists public.workout_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  date             date not null,
  name             text not null,
  type             text check (type in ('strength', 'cardio', 'flexibility', 'sport')),
  duration_minutes int,
  notes            text,
  created_at       timestamptz not null default now()
);
create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, date);

-- ── focus (Pomodoro) sessions ────────────────────────────────────────────────
create table if not exists public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  task_id          uuid references public.tasks (id) on delete set null,
  duration_minutes int not null,
  completed        boolean not null default true,
  note             text,
  created_at       timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id, created_at);

-- ── RLS owner policies ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['body_metrics', 'workout_logs', 'focus_sessions']
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
