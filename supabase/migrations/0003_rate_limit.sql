-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — per-user rate limiting in Postgres (replaces Upstash Redis).
--
-- Fixed-window counter, updated atomically in a single upsert. The AI routes
-- call check_rate_limit('<route>:<auth.uid()>', max, window_seconds) and deny
-- when the window count exceeds max. No external service required.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.rate_limits (
  key           text primary key,
  count         int not null default 0,
  window_start  timestamptz not null default now()
);

-- Lock the table down: RLS on, no policies → clients can't touch it directly.
-- The function below is SECURITY DEFINER, so it updates the table as the owner.
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key            text,
  p_max            int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_now    timestamptz := now();
  v_count  int;
  v_start  timestamptz;
  v_expired boolean;
begin
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update set
    count = case
      when r.window_start < v_now - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
      else r.window_start
    end
  returning r.count, r.window_start into v_count, v_start;

  return query
    select (v_count <= p_max),
           greatest(p_max - v_count, 0),
           v_start + make_interval(secs => p_window_seconds);
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
