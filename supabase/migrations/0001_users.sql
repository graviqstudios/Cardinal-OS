-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 0 schema: profiles (`users`) + RLS + signup trigger.
--
-- This `public.users` table holds the profile row that mirrors each row in
-- Supabase's `auth.users`. Its primary key `id` IS the auth user id, so the
-- per-user RLS rule is `auth.uid() = id` (the doc's generic "user_id = auth.uid()"
-- applied to this table, whose user identifier column is `id`).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.users (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text not null,
  name                    text,
  exam_target             text,
  exam_date               date,
  accent_color            text,          -- null until onboarding screen 1 completes
  theme                   text,          -- selected palette id
  trial_started_at        timestamptz not null default now(),
  is_pro                  boolean not null default false,
  subscription_expires_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── keep updated_at fresh ────────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_users_updated on public.users;
create trigger on_users_updated
  before update on public.users
  for each row execute function public.handle_updated_at();

-- ── Create a profile row automatically on signup ─────────────────────────────
-- Runs as SECURITY DEFINER so the insert bypasses RLS at signup time. `name` is
-- pulled from OAuth/email metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, trial_started_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
