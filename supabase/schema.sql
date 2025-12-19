-- CalculaTu SmartWeb - Supabase schema for exchange rates (manual, global)
-- Run this in Supabase SQL editor.

-- 1) Table
create table if not exists public.exchange_rates (
  id integer primary key,
  usd numeric not null,
  eur numeric not null,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);

-- 2) updated_at trigger
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

-- 3) Seed (singleton row id=1)
insert into public.exchange_rates (id, usd, eur, source)
values (1, 276.58, 326.16, 'seed')
on conflict (id) do nothing;

-- 4) RLS
alter table public.exchange_rates enable row level security;

-- Public read for both anon + authenticated
drop policy if exists "Public read rates" on public.exchange_rates;
create policy "Public read rates"
on public.exchange_rates
for select
to anon, authenticated
using (true);

-- Admin-only write: multiversagroup@gmail.com
-- Uses auth.jwt() to avoid relying on auth.email() availability.
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



