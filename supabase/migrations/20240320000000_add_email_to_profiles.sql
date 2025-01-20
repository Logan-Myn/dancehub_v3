-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN email TEXT;

-- Update existing profiles with emails from auth.users
UPDATE profiles 
SET email = au.email 
FROM auth.users au 
WHERE profiles.id = au.id;

-- Make email column NOT NULL after populating data
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Add an index on email for better query performance
CREATE INDEX idx_profiles_email ON profiles(email);

-- Add a comment explaining the column
COMMENT ON COLUMN profiles.email IS 'The email address of the user for notifications and communications'; 