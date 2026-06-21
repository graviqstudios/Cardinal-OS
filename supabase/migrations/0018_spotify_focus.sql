-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Spotify focus playlist. The user picks one playlist to be their
-- "focus playlist"; the focus timer (Phase D) will cue it when a session starts.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists focus_playlist_id text;
alter table public.users add column if not exists focus_playlist_name text;
