-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Journal entries (Daily Reflection on Today; full Journal area
-- in Phase E extends this with journal_chunks/RAG). All RLS'd.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        text not null default 'daily'
              check (type in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'note')),
  title       text,
  content     text,
  mood        int check (mood between 1 and 5),
  date        date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists journal_entries_user_idx on public.journal_entries (user_id, date desc);

drop trigger if exists on_journal_updated on public.journal_entries;
create trigger on_journal_updated before update on public.journal_entries
  for each row execute function public.handle_updated_at();

alter table public.journal_entries enable row level security;
drop policy if exists "owner_select" on public.journal_entries;
drop policy if exists "owner_insert" on public.journal_entries;
drop policy if exists "owner_update" on public.journal_entries;
drop policy if exists "owner_delete" on public.journal_entries;
create policy "owner_select" on public.journal_entries for select using (auth.uid() = user_id);
create policy "owner_insert" on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.journal_entries for delete using (auth.uid() = user_id);
