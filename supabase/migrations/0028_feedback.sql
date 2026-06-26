-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — user feedback & reviews. One table backs both the Settings
-- "Send feedback" form and the in-app feedback prompt. Owner-RLS'd: a user can
-- read and write only their own rows; the team reads across users via the
-- service-role key (admin client), never through this policy.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- 'feedback' (general), 'review' (testimonial-style), or 'bug'.
  kind              text not null default 'feedback'
                    check (kind in ('feedback', 'review', 'bug')),
  -- 1–5 stars; optional for pure bug reports.
  rating            int check (rating between 1 and 5),
  message           text,
  -- user consents to their words being shown publicly as a testimonial.
  allow_testimonial boolean not null default false,
  -- where it came from: 'settings' | 'prompt'.
  source            text,
  -- the page the user was on, for context.
  page              text,
  created_at        timestamptz not null default now()
);

create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

-- ── RLS owner policies ───────────────────────────────────────────────────────
alter table public.feedback enable row level security;
drop policy if exists "owner_select" on public.feedback;
drop policy if exists "owner_insert" on public.feedback;
create policy "owner_select" on public.feedback
  for select using (auth.uid() = user_id);
create policy "owner_insert" on public.feedback
  for insert with check (auth.uid() = user_id);
