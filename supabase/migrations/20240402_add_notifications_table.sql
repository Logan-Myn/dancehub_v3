-- Create notifications table
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text not null check (type in ('course_published', 'course_updated', 'announcement', 'other'))
);

-- Create indexes for better query performance
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at);

-- Enable RLS
alter table notifications enable row level security;

-- Create RLS policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Service role can create notifications"
  on notifications for insert
  with check (auth.role() = 'service_role');

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id); 