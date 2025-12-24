-- Add exchange rates history and trigger
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
