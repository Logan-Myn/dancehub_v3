-- First, let's check and fix the foreign key constraint
do $$ 
begin
  -- Drop the existing constraint if it exists
  alter table if exists fee_changes
    drop constraint if exists fee_changes_community_id_fkey;

  -- Recreate the constraint with ON DELETE CASCADE
  alter table fee_changes
    add constraint fee_changes_community_id_fkey
    foreign key (community_id)
    references communities(id)
    on delete cascade;
end $$;

-- Now create a simpler delete function that relies on cascading deletes
create or replace function delete_community(p_community_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete lessons first
  delete from lessons
  where chapter_id in (
    select ch.id 
    from chapters ch
    join courses c on ch.course_id = c.id
    where c.community_id = p_community_id
  );

  -- Delete chapters
  delete from chapters
  where course_id in (
    select id from courses
    where community_id = p_community_id
  );

  -- Delete courses
  delete from courses
  where community_id = p_community_id;

  -- Delete community members
  delete from community_members
  where community_id = p_community_id;

  -- Delete the community (fee_changes will be deleted automatically via ON DELETE CASCADE)
  delete from communities
  where id = p_community_id;
end;
$$; 