-- Run this in the Supabase SQL editor

-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

-- Reflections table
create table if not exists reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question text,
  answers jsonb,
  reflection text,
  created_at timestamptz default now()
);

-- Usage tracking
create table if not exists usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer default 0,
  period_start timestamptz default now(),
  is_paid boolean default false
);

-- Row Level Security
alter table reflections enable row level security;
alter table usage enable row level security;

create policy "Users can view own reflections"
  on reflections for select using (auth.uid() = user_id);

create policy "Users can insert own reflections"
  on reflections for insert with check (auth.uid() = user_id);

create policy "Users can view own usage"
  on usage for select using (auth.uid() = user_id);

create policy "Users can update own usage"
  on usage for update using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on usage for insert with check (auth.uid() = user_id);
