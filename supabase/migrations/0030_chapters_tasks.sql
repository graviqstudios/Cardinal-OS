-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Study depth: Chapters + study tasks.
--
-- Adds a real middle level to the study hierarchy: Subject → Chapter → Topic.
-- Topics keep being the masterable unit (heat map / practice / voice); they now
-- optionally belong to a chapter. Existing topics stay valid with a null
-- chapter_id ("unfiled") so nothing needs backfilling.
--
-- Also adds a per-subject task list (study_tasks) — distinct from the app-wide
-- /tasks module — so a subject page can hold its own to-dos.
-- ════════════════════════════════════════════════════════════════════════════

-- ── chapters ─────────────────────────────────────────────────────────────────
create table if not exists public.chapters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  name         text not null,
  order_index  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists chapters_subject_idx on public.chapters (subject_id);
create index if not exists chapters_user_idx on public.chapters (user_id);
drop trigger if exists on_chapters_updated on public.chapters;
create trigger on_chapters_updated before update on public.chapters
  for each row execute function public.handle_updated_at();

-- ── topics.chapter_id (nullable; unfiled topics keep null) ───────────────────
alter table public.topics
  add column if not exists chapter_id uuid references public.chapters (id) on delete set null;
create index if not exists topics_chapter_idx on public.topics (chapter_id);

-- ── study_tasks (per-subject to-dos, optionally tied to a chapter/topic) ─────
create table if not exists public.study_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid not null references public.subjects (id) on delete cascade,
  chapter_id   uuid references public.chapters (id) on delete set null,
  topic_id     uuid references public.topics (id) on delete set null,
  title        text not null,
  status       text not null default 'todo'
               check (status in ('todo', 'doing', 'done')),
  due_date     date,
  order_index  int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists study_tasks_subject_idx on public.study_tasks (subject_id);
create index if not exists study_tasks_user_idx on public.study_tasks (user_id);
drop trigger if exists on_study_tasks_updated on public.study_tasks;
create trigger on_study_tasks_updated before update on public.study_tasks
  for each row execute function public.handle_updated_at();

-- ── RLS owner policies ───────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['chapters', 'study_tasks']
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
