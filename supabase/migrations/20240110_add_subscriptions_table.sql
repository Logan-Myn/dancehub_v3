-- Create subscriptions table
create table if not exists subscriptions (
  id uuid primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id text not null,
  subscription_id text not null,
  status text not null,
  trial_end timestamp with time zone,
  current_period_end timestamp with time zone not null,
  
  constraint valid_status check (status in ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid'))
);

-- Create indexes for subscription lookups
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_subscription_id_idx on subscriptions(subscription_id);

-- Enable RLS
alter table subscriptions enable row level security;

-- RLS policies
create policy "Subscriptions are viewable by the user who owns them"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Subscriptions can be created by authenticated users"
  on subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Subscriptions can be updated by the user who owns them"
  on subscriptions for update
  using (auth.uid() = user_id); 