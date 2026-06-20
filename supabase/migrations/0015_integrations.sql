-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Integration layer (Phase K) foundation.
--
-- Stores OAuth tokens for connected services. Access/refresh tokens are
-- AES-256-GCM encrypted by the app before they ever reach the database (see
-- lib/integrations/crypto.ts), so even a DB dump never exposes a usable token.
-- Owner-only RLS; one connection per provider per user.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.integration_tokens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  provider       text not null check (provider in ('google', 'notion', 'spotify', 'evernote')),
  access_token   text not null,          -- encrypted
  refresh_token  text,                   -- encrypted, when the provider issues one
  expires_at     timestamptz,
  scopes         text[],
  account_label  text,                   -- e.g. the connected email / account name
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, provider)
);
create index if not exists integration_tokens_user_idx on public.integration_tokens (user_id);

drop trigger if exists on_integration_tokens_updated on public.integration_tokens;
create trigger on_integration_tokens_updated
  before update on public.integration_tokens
  for each row execute function public.handle_updated_at();

alter table public.integration_tokens enable row level security;
drop policy if exists "owner_select" on public.integration_tokens;
drop policy if exists "owner_insert" on public.integration_tokens;
drop policy if exists "owner_update" on public.integration_tokens;
drop policy if exists "owner_delete" on public.integration_tokens;
create policy "owner_select" on public.integration_tokens for select using (auth.uid() = user_id);
create policy "owner_insert" on public.integration_tokens for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.integration_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.integration_tokens for delete using (auth.uid() = user_id);
