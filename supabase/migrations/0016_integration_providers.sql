-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — split the single "google" integration into separate
-- "google_calendar" and "google_gmail" connections, so a user can grant
-- Calendar access without Gmail (and vice versa). One Google OAuth client backs
-- both; only the requested scope differs per connection.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.integration_tokens
  drop constraint if exists integration_tokens_provider_check;

alter table public.integration_tokens
  add constraint integration_tokens_provider_check
  check (provider in ('google_calendar', 'google_gmail', 'notion', 'spotify', 'evernote'));
