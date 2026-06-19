-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — first-run product tour.
--
-- Records when a user finishes (or skips) the welcome tour, so the guided
-- walkthrough on /today shows exactly once, across devices.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists tour_completed_at timestamptz;
