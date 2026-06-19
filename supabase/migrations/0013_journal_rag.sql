-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase E: "Ask your notes" RAG over journal entries.
--
-- Mirrors the document_chunks design (0002): each journal entry's text is
-- chunked + embedded (768-dim, Gemini or mock) into journal_chunks, searched by
-- cosine similarity via match_journal_chunks. Owner-only RLS throughout.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists vector;

create table if not exists public.journal_chunks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  entry_id     uuid not null references public.journal_entries (id) on delete cascade,
  content      text not null,
  chunk_index  int not null,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);
create index if not exists journal_chunks_entry_idx on public.journal_chunks (entry_id);
create index if not exists journal_chunks_user_idx on public.journal_chunks (user_id);
create index if not exists journal_chunks_embedding_idx
  on public.journal_chunks using hnsw (embedding vector_cosine_ops);

alter table public.journal_chunks enable row level security;
drop policy if exists "journal_chunks_select" on public.journal_chunks;
drop policy if exists "journal_chunks_insert" on public.journal_chunks;
drop policy if exists "journal_chunks_delete" on public.journal_chunks;
create policy "journal_chunks_select" on public.journal_chunks for select using (auth.uid() = user_id);
create policy "journal_chunks_insert" on public.journal_chunks for insert with check (auth.uid() = user_id);
create policy "journal_chunks_delete" on public.journal_chunks for delete using (auth.uid() = user_id);

-- ── Similarity search (security definer; scoped to the caller's own rows) ─────
create or replace function public.match_journal_chunks(
  query_embedding vector(768),
  p_user_id       uuid,
  match_count     int default 5
)
returns table (id uuid, entry_id uuid, content text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.entry_id, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.journal_chunks c
  where c.user_id = p_user_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
