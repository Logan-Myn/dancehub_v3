-- Create a new storage bucket for images
insert into storage.buckets (id, name, public)
values ('images', 'images', true);

-- Allow authenticated users to upload images
create policy "Allow authenticated users to upload images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'images' AND
  (storage.foldername(name)) = 'community-pages'
);

-- Allow public access to view images
create policy "Allow public access to view images"
on storage.objects for select
to public
using (bucket_id = 'images');

-- Allow authenticated users to update their own images
create policy "Allow authenticated users to update their own images"
on storage.objects for update
to authenticated
using (bucket_id = 'images' AND auth.uid() = owner)
with check (bucket_id = 'images' AND auth.uid() = owner);

-- Allow authenticated users to delete their own images
create policy "Allow authenticated users to delete their own images"
on storage.objects for delete
to authenticated
using (bucket_id = 'images' AND auth.uid() = owner);

-- Create a new storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Set up storage policy to allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars' AND
    name like 'avatars/%' AND
    name like '%' || auth.uid() || '%'
  );

-- Allow users to update their own avatar
create policy "Users can update their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars' AND
    name like 'avatars/%' AND
    name like '%' || auth.uid() || '%'
  );

-- Allow public access to avatars
create policy "Avatar images are publicly accessible" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars' AND
    name like 'avatars/%' AND
    name like '%' || auth.uid() || '%'
  ); 