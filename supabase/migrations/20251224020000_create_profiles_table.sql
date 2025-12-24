-- Create profiles table
create table if not exists public.profiles (
  machine_id text primary key,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( true ); -- We rely on machine_id being unique and client-side logic for now

create policy "Users can update their own profile"
  on public.profiles for update
  using ( true ); -- Simple policy for Alpha
