-- CalculaTú SmartWeb - Consolidated Supabase Schema (Alpha v2)
-- Run this in Supabase SQL editor (SQL Editor -> New Query).

-- ===========================
-- 1. EXCHANGE RATES
-- ===========================

-- Base rates table (Singleton)
create table if not exists public.exchange_rates (
  id integer primary key,
  usd numeric not null,
  eur numeric not null,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

-- Trigger for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_exchange_rates_updated_at on public.exchange_rates;
create trigger trg_exchange_rates_updated_at
before update on public.exchange_rates
for each row execute function public.set_updated_at();

-- Seed (singleton row id=1)
insert into public.exchange_rates (id, usd, eur, source)
values (1, 276.58, 326.16, 'seed')
on conflict (id) do nothing;

-- RLS for Rates
alter table public.exchange_rates enable row level security;

-- Public read
drop policy if exists "Public read rates" on public.exchange_rates;
create policy "Public read rates"
on public.exchange_rates
for select
to anon, authenticated
using (true);

-- Admin write (Role-based)
drop policy if exists "Admin insert rates" on public.exchange_rates;
create policy "Admin insert rates"
on public.exchange_rates
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where machine_id = (auth.jwt() ->> 'machine_id')
    and role = 'admin'
  )
  or (auth.jwt() ->> 'email') = 'multiversagroup@gmail.com'
);

drop policy if exists "Admin update rates" on public.exchange_rates;
create policy "Admin update rates"
on public.exchange_rates
for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where machine_id = (auth.jwt() ->> 'machine_id')
    and role = 'admin'
  )
  or (auth.jwt() ->> 'email') = 'multiversagroup@gmail.com'
);

-- ===========================
-- 2. EXCHANGE RATES HISTORY
-- ===========================

create table if not exists public.exchange_rates_history (
  id uuid primary key default gen_random_uuid(),
  usd numeric not null,
  eur numeric not null,
  source text not null,
  created_at timestamptz not null default now()
);

-- RLS for History
alter table public.exchange_rates_history enable row level security;

-- Public read history
drop policy if exists "Public read history" on public.exchange_rates_history;
create policy "Public read history"
on public.exchange_rates_history
for select
to anon, authenticated
using (true);

-- Trigger function to log history
create or replace function public.log_exchange_rate_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.exchange_rates_history (usd, eur, source, created_at)
  values (new.usd, new.eur, new.source, now());
  return new;
end;
$$;

-- Create trigger on exchange_rates
drop trigger if exists trg_log_exchange_rate_history on public.exchange_rates;
create trigger trg_log_exchange_rate_history
after insert or update on public.exchange_rates
for each row execute function public.log_exchange_rate_history();

-- Seed initial history from current rates
insert into public.exchange_rates_history (usd, eur, source, created_at)
select usd, eur, source, updated_at from public.exchange_rates
on conflict do nothing;

-- ===========================
-- 3. CONTRACTS (Device Lock / Licensing)
-- ===========================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  email text not null,
  plan text not null, -- 'monthly', 'lifetime'
  token text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'active' -- 'active', 'expired', 'revoked'
);

-- RLS for Contracts
alter table public.contracts enable row level security;

-- Admin full access contracts (Role-based)
drop policy if exists "Admin full access contracts" on public.contracts;
create policy "Admin full access contracts"
on public.contracts
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where machine_id = (auth.jwt() ->> 'machine_id')
    and role = 'admin'
  )
  or (auth.jwt() ->> 'email') = 'multiversagroup@gmail.com'
)
with check (
  exists (
    select 1 from public.profiles
    where machine_id = (auth.jwt() ->> 'machine_id')
    and role = 'admin'
  )
  or (auth.jwt() ->> 'email') = 'multiversagroup@gmail.com'
);

-- Public lookup
drop policy if exists "Public machine lookup" on public.contracts;
create policy "Public machine lookup"
on public.contracts
for select
to anon, authenticated
using (true);


-- ===========================
-- 4. USER PROFILES (Personalization)
-- ===========================
create table if not exists public.profiles (
  machine_id text primary key,
  full_name text,
  email text,
  role text not null default 'user', -- 'user', 'admin'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed your MachineID as admin (M-4O85WSTW93)
insert into public.profiles (machine_id, full_name, role)
values ('M-4O85WSTW93', 'Alpha Admin', 'admin')
on conflict (machine_id) do update set role = 'admin';

-- RLS for Profiles
alter table public.profiles enable row level security;

-- Public access policies
drop policy if exists "Public access profiles" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( true );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( true );