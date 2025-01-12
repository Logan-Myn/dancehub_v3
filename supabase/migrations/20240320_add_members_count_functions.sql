-- First, ensure we have a members_count column in communities table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'communities' AND column_name = 'members_count') THEN
        ALTER TABLE communities
        ADD COLUMN members_count INTEGER DEFAULT 0;
        
        -- Initialize members_count for existing communities
        UPDATE communities c
        SET members_count = (
            SELECT COUNT(*)
            FROM community_members cm
            WHERE cm.community_id = c.id
        );
    END IF;
END $$;

-- Create function to increment members count
CREATE OR REPLACE FUNCTION public.increment_members_count(community_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE communities
    SET members_count = members_count + 1
    WHERE id = community_id;
END;
$$;

-- Create function to decrement members count
CREATE OR REPLACE FUNCTION public.decrement_members_count(community_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE communities
    SET members_count = GREATEST(members_count - 1, 0)
    WHERE id = community_id;
END;
$$;

-- Create trigger to automatically update members_count
CREATE OR REPLACE FUNCTION public.update_community_members_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM increment_members_count(NEW.community_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM decrement_members_count(OLD.community_id);
    END IF;
    RETURN NULL;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS update_members_count_trigger ON community_members;

-- Create the trigger
CREATE TRIGGER update_members_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_members_count(); 