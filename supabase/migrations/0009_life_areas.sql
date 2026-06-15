-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — v3 Life OS pivot, Phase A foundation.
-- Habits, Tasks, Projects, Skills + the life_scores ring history.
-- (FK order fixed vs the doc: projects/skills created BEFORE tasks.)
-- All RLS'd (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── habits ────────────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  icon        text,
  color       text,
  routine     text not null default 'any' check (routine in ('morning', 'evening', 'any')),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.habit_logs (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null references public.habits (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  logged_date  date not null,
  completed    boolean not null default false,
  unique (habit_id, logged_date)
);
create index if not exists habit_logs_user_date_idx on public.habit_logs (user_id, logged_date);

-- ── projects (before tasks: tasks reference it) ──────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'upcoming', 'later')),
  progress    int not null default 0 check (progress between 0 and 100),
  color       text,
  created_at  timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id);

-- ── skills (skill tree) ───────────────────────────────────────────────────────
create table if not exists public.skills (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  level      int not null default 1,
  xp         int not null default 0,
  area_tag   text,
  created_at timestamptz not null default now()
);

-- ── tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  status       text not null default 'next'
               check (status in ('today', 'next', 'in_progress', 'weekly', 'done')),
  priority     text check (priority in ('p1', 'p2', 'p3')),
  due_date     date,
  project_id   uuid references public.projects (id) on delete set null,
  goal_id      uuid references public.goals (id) on delete set null,
  recurring    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);

-- ── life_scores (the main ring history) ──────────────────────────────────────
create table if not exists public.life_scores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null default (now() at time zone 'utc')::date,
  score          int not null,
  breakdown      jsonb,   -- { habits, tasks, goals, balance }
  calculated_at  timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists life_scores_user_day_idx on public.life_scores (user_id, day desc);

-- ── updated_at not needed here; ── RLS owner policies ────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'habits','habit_logs','projects','skills','tasks','life_scores'
  ]
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
