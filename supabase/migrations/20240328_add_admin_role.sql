-- Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN is_admin boolean DEFAULT false;

-- Create admin_access_log table to track admin actions
CREATE TABLE admin_access_log (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on admin_access_log
ALTER TABLE admin_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the access log
CREATE POLICY "Only admins can view access log"
    ON admin_access_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Only admins can insert into access log
CREATE POLICY "Only admins can insert into access log"
    ON admin_access_log
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    action text,
    resource_type text DEFAULT NULL,
    resource_id text DEFAULT NULL,
    metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'User is not an admin';
    END IF;

    INSERT INTO admin_access_log (admin_id, action, resource_type, resource_id, metadata)
    VALUES (auth.uid(), action, resource_type, resource_id, metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 