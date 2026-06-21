-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase J: identity-framed goals + skill tree.
--
-- Adds an "identity" line to goals ("I am someone who ships"). The skills table
-- (name, level, xp, area_tag) already exists from 0009_life_areas.sql, so this
-- migration only extends goals.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.goals add column if not exists identity text;
