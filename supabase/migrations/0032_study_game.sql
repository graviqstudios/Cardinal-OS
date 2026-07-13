-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Constellation gamification: shared study minutes.
--
-- Adds a 7-day study-minutes figure to each member's shareable snapshot so the
-- Constellation leaderboard can rank friends by effort (minutes) as well as
-- readiness and streak. Computed from focus sessions + practice sessions in
-- publishPodStats (lib/pods/actions.ts).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.pod_stats
  add column if not exists study_minutes int not null default 0;
