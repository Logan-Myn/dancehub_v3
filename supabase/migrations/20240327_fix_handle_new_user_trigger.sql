-- Update the handle_new_user trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  avatar_url text;
  full_name text;
BEGIN
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
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      jsonb_set(
        raw_user_meta_data,
        '{avatar_url}',
        to_jsonb(avatar_url)
      ),
      '{full_name}',
      to_jsonb(full_name)
    )
  WHERE id = new.id;

  -- Insert into profiles with email
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, full_name, avatar_url, new.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 
