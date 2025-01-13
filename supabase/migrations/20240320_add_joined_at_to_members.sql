ALTER TABLE community_members
ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have a joined_at timestamp
UPDATE community_members
SET joined_at = created_at
WHERE joined_at IS NULL; 