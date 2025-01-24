-- Enable RLS on fee_changes table
alter table fee_changes enable row level security;

-- Create policies for fee_changes table
create policy "Service role can manage fee changes"
  on fee_changes for all
  using (auth.role() = 'service_role');

create policy "Community admins can view their community fee changes"
  on fee_changes for select
  using (
    exists (
      select 1 from community_members
      where community_members.community_id = fee_changes.community_id
      and community_members.user_id = auth.uid()
      and community_members.role = 'admin'
    )
  ); 