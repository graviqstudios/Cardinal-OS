-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Google Calendar sync support.
--
-- Tags events with their external (Google) id and source so a pull from Google
-- can dedupe/update in place, and events created in Cardinal can be pushed up
-- and later recognised. NULL external_id (most events) stay distinct under the
-- unique index, so existing rows are unaffected.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.events add column if not exists external_id text;
alter table public.events add column if not exists source text;

create unique index if not exists events_user_external_idx
  on public.events (user_id, external_id);
