create table if not exists public.password_reset_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  
  constraint password_reset_requests_token_key unique (token)
);

-- Enable RLS
alter table public.password_reset_requests enable row level security;

-- Drop existing policy if it exists
drop policy if exists "Only service role can access password reset requests" on password_reset_requests;

-- Create policies
create policy "Only service role can access password reset requests"
  on password_reset_requests for all
  using (auth.jwt() ->> 'role' = 'service_role'); 