-- ════════════════════════════════════════════════════════════════════════════
-- Cardinal OS — Phase 4: Money Tracker.
-- Tables: transactions, budgets, savings_goals. All RLS'd (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric not null check (amount >= 0),
  direction   text not null default 'expense' check (direction in ('expense', 'income')),
  category    text not null default 'Other',
  note        text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions (user_id, occurred_at desc);

create table if not exists public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  category       text not null,
  monthly_limit  numeric not null check (monthly_limit >= 0),
  created_at     timestamptz not null default now(),
  unique (user_id, category)
);

create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  target_amount  numeric not null check (target_amount > 0),
  target_date    date,
  created_at     timestamptz not null default now()
);
create index if not exists savings_user_idx on public.savings_goals (user_id);

do $$
declare t text;
begin
  foreach t in array array['transactions','budgets','savings_goals']
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
