-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Exam Prep as an opt-in template.
--
-- Adds `exam_mode` to `public.users`. When false (the default for every new
-- account), the exam-prep tools — Study, Practice, Heatmap and Voice — are
-- hidden from the sidebar and their routes redirect home, so general users
-- never see exam jargon. Users opt in from Settings → Exam Prep.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists exam_mode boolean not null default false;
