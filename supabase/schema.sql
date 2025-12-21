-- CalculaTu SmartWeb - Supabase schema
-- Run this in Supabase SQL editor (SQL Editor -> New Query).

-- ===========================
-- 1. EXCHANGE RATES
-- ===========================
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

-- Admin write
drop policy if exists "Admin insert rates" on public.exchange_rates;
create policy "Admin insert rates"
on public.exchange_rates
for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'multiversagroup@gmail.com');

drop policy if exists "Admin update rates" on public.exchange_rates;
create policy "Admin update rates"
on public.exchange_rates
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'multiversagroup@gmail.com')
with check ((auth.jwt() ->> 'email') = 'multiversagroup@gmail.com');


-- ===========================
-- 2. CONTRACTS (Device Lock)
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

-- Admin full access
drop policy if exists "Admin full access contracts" on public.contracts;
create policy "Admin full access contracts"
on public.contracts
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'multiversagroup@gmail.com')
with check ((auth.jwt() ->> 'email') = 'multiversagroup@gmail.com');

-- Public lookup (needed for 'Restore Purchase' or client-side checks)
drop policy if exists "Public machine lookup" on public.contracts;
create policy "Public machine lookup"
on public.contracts
for select
to anon, authenticated
using (true);



