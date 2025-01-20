create table if not exists public.signup_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  
  constraint signup_verifications_token_key unique (token)
);

-- Enable RLS
alter table public.signup_verifications enable row level security;

-- Create policies
create policy "Only service role can access signup verifications"
  on signup_verifications for all
  using (auth.jwt() ->> 'role' = 'service_role'); 