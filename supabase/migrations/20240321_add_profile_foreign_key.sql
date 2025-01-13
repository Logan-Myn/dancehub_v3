-- Add foreign key constraint between community_members and profiles
ALTER TABLE community_members
ADD CONSTRAINT fk_community_members_profiles
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;

-- Create a view that joins community_members with profiles
CREATE OR REPLACE VIEW community_members_with_profiles AS
SELECT 
    cm.*,
    p.full_name,
    p.avatar_url
FROM 
    community_members cm
LEFT JOIN 
    profiles p ON cm.user_id = p.id; 