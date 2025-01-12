-- Add joined_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'community_members' AND column_name = 'joined_at') THEN
        ALTER TABLE community_members
        ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        
        -- Update existing rows to have a joined_at timestamp
        UPDATE community_members
        SET joined_at = created_at
        WHERE joined_at IS NULL;
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'community_members' AND column_name = 'status') THEN
        ALTER TABLE community_members
        ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive'));
        
        -- Update existing rows to have a status
        UPDATE community_members
        SET status = 'active'
        WHERE status IS NULL;
    END IF;
END $$; 