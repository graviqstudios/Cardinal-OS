-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Study target readiness.
--
-- The exam target already lives on `public.users` as `exam_target` (name) and
-- `exam_date` (the sitting). The single Study dashboard adds an optional target
-- Readiness Score (0–1000) so the countdown banner can show "you're at 640,
-- aiming for 800". Reuses the existing profile row rather than a new table.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists exam_target_score int
    check (exam_target_score between 0 and 1000);
