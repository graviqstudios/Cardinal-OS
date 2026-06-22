-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — versioned product tour.
--
-- The welcome walkthrough now re-runs whenever it materially changes. We track
-- the highest tour version a user has seen; the app shows the tour while their
-- seen version is below the current TOUR_VERSION (see lib/tour/version.ts).
-- Existing users default to 0, so they will see the refreshed tour once.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists tour_version int not null default 0;
