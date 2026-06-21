-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — record acceptance of the Terms & Privacy Policy. Shown as a
-- one-time, blocking consent gate on first sign-in until accepted.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists terms_accepted_at timestamptz;
