-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — usernames for email/password signups.
--
-- Google / existing users keep username = null (they can set one later in
-- Settings). Manual signups collect "What should I call you?" → username, which
-- is passed in the auth metadata and picked up by the signup trigger below.
--
-- Usernames are case-insensitive-unique (citext). Because RLS hides other users'
-- rows, the client can't check availability with a plain select — so a
-- SECURITY DEFINER RPC `is_username_available()` does the lookup safely.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists citext;

alter table public.users add column if not exists username citext;

-- One row per username (nulls allowed — Google/legacy users have none).
create unique index if not exists users_username_key
  on public.users (username)
  where username is not null;

-- ── Availability check (callable by anon during signup) ──────────────────────
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.users where username = candidate::citext
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ── Capture username at signup ───────────────────────────────────────────────
-- Replaces the 0001 trigger function; now also reads `username` from the auth
-- metadata when present. The unique index is the backstop against races.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, username, trial_started_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    nullif(new.raw_user_meta_data ->> 'username', '')::citext,
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
