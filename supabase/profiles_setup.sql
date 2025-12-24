-- ===========================
-- 3. USER PROFILES (Personalization)
-- ===========================
create table if not exists public.profiles (
  machine_id text primary key,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for Profiles
alter table public.profiles enable row level security;

-- Allow public access (Pseudo-auth via Machine ID)
drop policy if exists "Public access profiles" on public.profiles;
create policy "Public access profiles"
on public.profiles
for all
to anon, authenticated
using (true)
with check (true);
