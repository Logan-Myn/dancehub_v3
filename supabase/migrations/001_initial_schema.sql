-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Communities table
create table if not exists communities (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  created_by uuid references auth.users(id) on delete cascade not null,
  price numeric(10,2),
  currency text,
  membership_enabled boolean default false,
  membership_price numeric(10,2),
  stripe_account_id text,
  thread_categories jsonb,
  
  constraint valid_price check (price >= 0),
  constraint valid_membership_price check (membership_price >= 0)
);

-- Create index for slug lookups
create index if not exists communities_slug_idx on communities(slug);

-- Members junction table
create table if not exists members (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  community_id uuid references communities(id) on delete cascade not null,
  
  unique(user_id, community_id)
);

-- Create indexes for membership lookups
create index if not exists members_user_id_idx on members(user_id);
create index if not exists members_community_id_idx on members(community_id);

-- Threads table
create table if not exists threads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  content text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  community_id uuid references communities(id) on delete cascade not null,
  category_id text,
  likes uuid[] default array[]::uuid[],
  comments jsonb[] default array[]::jsonb[]
);

-- Create indexes for thread lookups
create index if not exists threads_community_id_idx on threads(community_id);
create index if not exists threads_user_id_idx on threads(user_id);

-- Row Level Security Policies

-- Communities policies
alter table communities enable row level security;

create policy "Communities are viewable by everyone"
  on communities for select
  using (true);

create policy "Communities can be created by authenticated users"
  on communities for insert
  with check (auth.uid() = created_by);

create policy "Communities can be updated by their creators"
  on communities for update
  using (auth.uid() = created_by);

-- Members policies
alter table members enable row level security;

create policy "Members are viewable by everyone"
  on members for select
  using (true);

create policy "Users can join communities"
  on members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave communities"
  on members for delete
  using (auth.uid() = user_id);

-- Threads policies
alter table threads enable row level security;

create policy "Threads are viewable by everyone"
  on threads for select
  using (true);

create policy "Authenticated users can create threads"
  on threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own threads"
  on threads for update
  using (auth.uid() = user_id); 