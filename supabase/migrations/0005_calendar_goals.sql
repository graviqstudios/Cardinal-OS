-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 3: Smart Calendar + Goal Planner.
-- Tables: events, goals, milestones, career_targets. All RLS'd (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── events ───────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  all_day     boolean not null default false,
  -- module the event belongs to (drives its colour): study|calendar|goals|money|other
  type        text not null default 'calendar'
              check (type in ('study', 'calendar', 'goals', 'money', 'other')),
  created_at  timestamptz not null default now()
);
create index if not exists events_user_start_idx on public.events (user_id, start_time);

-- ── goals ────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  type         text not null default 'personal' check (type in ('personal', 'exam')),
  target_date  date,
  progress     int not null default 0 check (progress between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);
drop trigger if exists on_goals_updated on public.goals;
create trigger on_goals_updated before update on public.goals
  for each row execute function public.handle_updated_at();

-- ── milestones ───────────────────────────────────────────────────────────────
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.goals (id) on delete cascade,
  title       text not null,
  completed   boolean not null default false,
  due_date    date,
  created_at  timestamptz not null default now()
);
create index if not exists milestones_goal_idx on public.milestones (goal_id);

-- ── career_targets ───────────────────────────────────────────────────────────
create table if not exists public.career_targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  required_score text,
  current_score  text,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists career_user_idx on public.career_targets (user_id);

-- ── RLS: per-table owner policies ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['events','goals','milestones','career_targets']
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
