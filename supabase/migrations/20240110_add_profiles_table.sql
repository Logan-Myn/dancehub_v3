-- Create profiles table if it doesn't exist
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Ensure all auth.users have a profile
insert into profiles (id, full_name)
select 
  id,
  raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;

-- Create or modify members table
create table if not exists members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  community_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_active timestamp with time zone default timezone('utc'::text, now()),
  foreign key (user_id) references auth.users(id) on delete cascade,
  foreign key (community_id) references communities(id) on delete cascade
);

-- Add last_active column if it doesn't exist
do $$ 
begin
  if not exists (
    select 1 
    from information_schema.columns 
    where table_name = 'members' 
    and column_name = 'last_active'
  ) then
    alter table members 
    add column last_active timestamp with time zone default timezone('utc'::text, now());
  end if;
end $$;

-- Create unique constraint if it doesn't exist
alter table members 
  drop constraint if exists unique_community_member;

alter table members 
  add constraint unique_community_member unique (community_id, user_id);

-- Create indexes for better query performance
create index if not exists members_user_id_idx on members(user_id);
create index if not exists members_community_id_idx on members(community_id);

-- Create function to get users by IDs
create or replace function get_users_by_ids(user_ids uuid[])
returns table (
  id uuid,
  email text
)
security definer
set search_path = public
language plpgsql
as $$
begin
  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(user_ids);
end;
$$; 