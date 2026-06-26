-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — performance indexes. The Life Score, insights, Today, study and
-- journal queries all filter by `user_id` plus a status/type/time predicate. The
-- base `(user_id)` and `(user_id, <date>)` indexes already exist (migrations
-- 0001–0020); this adds the missing *composite* indexes those hot queries need
-- so Postgres can range-scan instead of filtering after a broader scan.
--
-- All guarded with `if not exists`, so the migration is safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- Life Score filters active habits: `where user_id = ? and archived = false`.
create index if not exists habits_user_archived_idx
  on public.habits (user_id, archived);

-- Life Score / Today read recently-created tasks: `user_id = ? and created_at >= ?`.
create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at);

-- Insights reads completed tasks: `user_id = ? and status = 'done' and completed_at >= ?`.
create index if not exists tasks_user_completed_idx
  on public.tasks (user_id, completed_at);

-- Today's reflection looks up by type + day: `user_id = ? and type = 'daily' and date = ?`.
create index if not exists journal_entries_user_type_date_idx
  on public.journal_entries (user_id, type, date);

-- Study picks the latest session: `user_id = ? order by updated_at desc`.
create index if not exists chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

-- Chat history reads in order: `chat_session_id = ? order by created_at`.
create index if not exists chat_messages_session_created_idx
  on public.chat_messages (chat_session_id, created_at);

-- Skills list (no composite needed, but the base index is absent pre-0027).
create index if not exists skills_user_idx
  on public.skills (user_id);
