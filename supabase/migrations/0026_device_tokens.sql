-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — push notification device tokens (Android / FCM).
--
-- Each signed-in user can have several devices. We store the FCM registration
-- token per device so the server can push (daily reflection nudge, streak,
-- monthly review). Tokens rotate, so (user_id, token) is unique and we upsert.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  token       text not null,
  platform    text not null default 'android',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
  on public.device_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists on_device_tokens_updated on public.device_tokens;
create trigger on_device_tokens_updated
  before update on public.device_tokens
  for each row execute function public.handle_updated_at();
