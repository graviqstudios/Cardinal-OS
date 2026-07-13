-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — AI token budget.
--
-- The study assistant is metered by real tokens per user per day (input +
-- output), on top of the existing per-minute request rate limiter. One row per
-- user per day; a SECURITY DEFINER RPC increments it atomically so concurrent
-- streams can't lose writes.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage (
  user_id        uuid not null references auth.users (id) on delete cascade,
  day            date not null default current_date,
  input_tokens   int not null default 0,
  output_tokens  int not null default 0,
  updated_at     timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
drop policy if exists "owner_select" on public.ai_usage;
create policy "owner_select" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomic increment for today's row (bypasses RLS but always keys off auth.uid()).
create or replace function public.record_ai_usage(p_in int, p_out int)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage (user_id, day, input_tokens, output_tokens, updated_at)
  values (auth.uid(), current_date, greatest(coalesce(p_in, 0), 0),
          greatest(coalesce(p_out, 0), 0), now())
  on conflict (user_id, day) do update
    set input_tokens  = public.ai_usage.input_tokens  + greatest(coalesce(p_in, 0), 0),
        output_tokens = public.ai_usage.output_tokens + greatest(coalesce(p_out, 0), 0),
        updated_at    = now();
$$;

grant execute on function public.record_ai_usage(int, int) to authenticated;
