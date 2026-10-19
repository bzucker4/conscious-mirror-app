-- Run this in the Supabase SQL editor. Safe to re-run: it also hardens a database
-- that already ran the first version of this file.

create extension if not exists "uuid-ossp";

-- Reflections
create table if not exists reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text,
  answers jsonb,
  reflection text,
  created_at timestamptz default now()
);

-- Usage tracking (written only by the server with the service-role key)
create table if not exists usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer default 0,
  period_start timestamptz default now(),
  is_paid boolean default false
);

alter table reflections enable row level security;
alter table usage enable row level security;

-- Remove the permissive policies from the first version of this schema.
-- With them, a signed-in user could reset their own count or set is_paid = true.
drop policy if exists "Users can update own usage" on usage;
drop policy if exists "Users can insert own usage" on usage;
drop policy if exists "Users can insert own reflections" on reflections;

-- Users may read their own rows, and delete their own reflections.
-- All writes go through the server (service role bypasses RLS).
drop policy if exists "Users can view own reflections" on reflections;
create policy "Users can view own reflections"
  on reflections for select using (auth.uid() = user_id);

drop policy if exists "Users can delete own reflections" on reflections;
create policy "Users can delete own reflections"
  on reflections for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own usage" on usage;
create policy "Users can view own usage"
  on usage for select using (auth.uid() = user_id);

-- Atomically spend one reflection. Resets the 30-day window when it has lapsed.
-- remaining = -1 means unlimited (paid).
create or replace function consume_reflection(p_user uuid, p_limit int)
returns table (allowed boolean, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  u usage%rowtype;
begin
  insert into usage (user_id) values (p_user) on conflict (user_id) do nothing;

  select * into u from usage where user_id = p_user for update;

  if u.period_start < now() - interval '30 days' then
    update usage set count = 0, period_start = now() where user_id = p_user;
    u.count := 0;
  end if;

  if u.is_paid then
    update usage set count = count + 1 where user_id = p_user;
    return query select true, -1;
    return;
  end if;

  if u.count >= p_limit then
    return query select false, 0;
    return;
  end if;

  update usage set count = count + 1 where user_id = p_user;
  return query select true, p_limit - u.count - 1;
end;
$$;

-- Give a reflection back when the model call fails.
create or replace function refund_reflection(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update usage set count = greatest(count - 1, 0) where user_id = p_user;
$$;

-- Only the server (service role) may call these.
revoke all on function consume_reflection(uuid, int) from public, anon, authenticated;
revoke all on function refund_reflection(uuid) from public, anon, authenticated;
grant execute on function consume_reflection(uuid, int) to service_role;
grant execute on function refund_reflection(uuid) to service_role;
