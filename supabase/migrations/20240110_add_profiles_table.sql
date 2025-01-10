-- Create profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  avatar_url text,
  stripe_account_id text
);

-- Enable RLS
alter table profiles enable row level security;

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

-- Add foreign key to threads table for author if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'threads_user_id_fkey'
  ) then
    alter table threads
    add constraint threads_user_id_fkey
    foreign key (user_id)
    references profiles(id)
    on delete cascade;
  end if;
end $$; 