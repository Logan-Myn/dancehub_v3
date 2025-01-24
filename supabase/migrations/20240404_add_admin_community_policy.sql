-- Drop only the admin policies if they exist
DROP POLICY IF EXISTS "Admins can manage community members" ON community_members;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage fee changes" ON fee_changes;

-- Create policy to allow admins to manage community members
CREATE POLICY "Admins can manage community members"
ON community_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create policy to allow admins to manage any profile
CREATE POLICY "Admins can manage user profiles"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.is_admin = true
  )
);

-- Create policy to allow admins to manage fee changes
CREATE POLICY "Admins can manage fee changes"
ON fee_changes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create function to allow admins to update user emails
CREATE OR REPLACE FUNCTION update_user_email(user_id UUID, new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the executing user is an admin
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    -- Only update if the email is actually different
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = user_id
      AND email != new_email
    ) THEN
      -- Update the user's email in auth.users
      UPDATE auth.users
      SET email = new_email,
          updated_at = now()
      WHERE id = user_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only admins can update user emails';
  END IF;
END;
$$; 