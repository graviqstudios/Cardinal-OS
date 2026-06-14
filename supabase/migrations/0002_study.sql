-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 1 schema: AI Study Assistant.
--
-- Tables: subjects, topics, practice_sessions, documents, document_chunks,
--         chat_sessions, chat_messages (chat_* are added beyond the original
--         doc schema because "message history persisted in Supabase" needs them).
--
-- Every table carries user_id and an RLS policy of `user_id = auth.uid()`.
-- pgvector is enabled here; embeddings are 768-dim to match Gemini
-- text-embedding-004 (the doc's vector(1536) was OpenAI-shaped).
-- A private `documents` Storage bucket + its RLS policies are created too, so
-- there are no manual dashboard clicks.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists vector;

-- ── helper: updated_at (created in 0001; redefine defensively) ────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── subjects ─────────────────────────────────────────────────────────────────
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists subjects_user_idx on public.subjects (user_id);

-- ── topics ───────────────────────────────────────────────────────────────────
create table if not exists public.topics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  name        text not null,
  status      text not null default 'untouched'
              check (status in ('untouched', 'weak', 'moderate', 'strong')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists topics_subject_idx on public.topics (subject_id);
create index if not exists topics_user_idx on public.topics (user_id);
drop trigger if exists on_topics_updated on public.topics;
create trigger on_topics_updated before update on public.topics
  for each row execute function public.handle_updated_at();

-- ── practice_sessions ────────────────────────────────────────────────────────
create table if not exists public.practice_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  topic_id          uuid references public.topics (id) on delete set null,
  score             numeric,
  max_score         numeric,
  duration_minutes  numeric,
  created_at        timestamptz not null default now()
);
create index if not exists practice_user_idx on public.practice_sessions (user_id);

-- ── documents ────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid references public.subjects (id) on delete set null,
  file_name   text not null,
  file_url    text,
  status      text not null default 'processing'
              check (status in ('processing', 'ready', 'error')),
  created_at  timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents (user_id);

-- ── document_chunks (pgvector) ───────────────────────────────────────────────
create table if not exists public.document_chunks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  document_id  uuid not null references public.documents (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  content      text not null,
  chunk_index  int not null default 0,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);
create index if not exists chunks_document_idx on public.document_chunks (document_id);
create index if not exists chunks_user_idx on public.document_chunks (user_id);
create index if not exists chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- ── chat_sessions / chat_messages ────────────────────────────────────────────
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  subject_id  uuid references public.subjects (id) on delete set null,
  title       text not null default 'New chat',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists chat_sessions_user_idx on public.chat_sessions (user_id);
drop trigger if exists on_chat_sessions_updated on public.chat_sessions;
create trigger on_chat_sessions_updated before update on public.chat_sessions
  for each row execute function public.handle_updated_at();

create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  chat_session_id  uuid not null references public.chat_sessions (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'system')),
  content          text not null,
  created_at       timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages (chat_session_id);

-- ── RLS: enable + per-table `user_id = auth.uid()` policies ───────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'subjects','topics','practice_sessions','documents',
    'document_chunks','chat_sessions','chat_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "owner_select" on public.%I;', t);
    execute format('drop policy if exists "owner_insert" on public.%I;', t);
    execute format('drop policy if exists "owner_update" on public.%I;', t);
    execute format('drop policy if exists "owner_delete" on public.%I;', t);
    execute format($f$create policy "owner_select" on public.%I for select using (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_insert" on public.%I for insert with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "owner_delete" on public.%I for delete using (auth.uid() = user_id);$f$, t);
  end loop;
end $$;

-- ── RAG: user-scoped cosine similarity search ────────────────────────────────
-- SECURITY DEFINER so it can read chunks, but it always filters by the passed
-- user id (the API passes auth.uid()), and optionally by subject.
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  p_user_id       uuid,
  match_count     int default 5,
  p_subject_id    uuid default null
)
returns table (id uuid, document_id uuid, content text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.document_id, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.user_id = p_user_id
    and c.embedding is not null
    and (p_subject_id is null or c.subject_id = p_subject_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Storage: private `documents` bucket + per-user-folder RLS ─────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_owner_select" on storage.objects;
drop policy if exists "documents_owner_insert" on storage.objects;
drop policy if exists "documents_owner_delete" on storage.objects;

create policy "documents_owner_select" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_owner_insert" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_owner_delete" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
