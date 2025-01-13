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

-- Create function to handle new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
declare
  avatar_url text;
  full_name text;
begin
  -- Get the avatar URL from Google metadata or fallback
  avatar_url := coalesce(
    new.raw_user_meta_data->>'picture',  -- Google OAuth picture
    new.raw_user_meta_data->>'avatar_url',  -- Custom avatar_url
    'https://api.multiavatar.com/' || new.id || '.svg'  -- Fallback avatar
  );

  -- Get the full name from metadata or fallback
  full_name := coalesce(
    new.raw_user_meta_data->>'full_name',  -- Our custom full_name
    new.raw_user_meta_data->>'name',  -- Google OAuth name
    split_part(new.email, '@', 1)  -- Fallback to email username
  );

  -- Update the user's metadata to ensure consistency
  update auth.users
  set raw_user_meta_data = 
    jsonb_set(
      jsonb_set(
        raw_user_meta_data,
        '{avatar_url}',
        to_jsonb(avatar_url)
      ),
      '{full_name}',
      to_jsonb(full_name)
    )
  where id = new.id;

  -- Insert into profiles
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, full_name, avatar_url);

  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 