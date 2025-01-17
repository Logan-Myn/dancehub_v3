-- Drop the existing view
DROP VIEW IF EXISTS community_members_with_profiles;

-- Recreate the view with display_name
CREATE OR REPLACE VIEW community_members_with_profiles AS
SELECT 
    cm.*,
    p.full_name,
    p.avatar_url,
    p.display_name,
    COALESCE(p.display_name, 
        CASE 
            WHEN p.full_name IS NOT NULL THEN 
                format_display_name(p.full_name)
            ELSE 
                'Anonymous'
        END
    ) as formatted_display_name
FROM 
    community_members cm
LEFT JOIN 
    profiles p ON cm.user_id = p.id; 