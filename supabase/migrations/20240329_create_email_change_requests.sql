create table if not exists public.email_change_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  new_email text not null,
  token text not null unique,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now(),
  
  constraint email_change_requests_token_key unique (token)
);

-- Add RLS policies
alter table public.email_change_requests enable row level security;

create policy "Users can view their own email change requests"
  on public.email_change_requests for select
  using (auth.uid() = user_id);

create policy "Only authenticated users can create email change requests"
  on public.email_change_requests for insert
  with check (auth.role() = 'authenticated');

create policy "Only service role can delete email change requests"
  on public.email_change_requests for delete
  using (auth.jwt() ->> 'role' = 'service_role'); 