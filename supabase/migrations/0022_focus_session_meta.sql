-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — focus session metadata: a title and an optional habit link
-- (task link already exists), for the full-screen distraction-free focus mode.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.focus_sessions add column if not exists title text;
alter table public.focus_sessions add column if not exists description text;
alter table public.focus_sessions
  add column if not exists habit_id uuid references public.habits (id) on delete set null;
