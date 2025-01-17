-- Add columns for tracking member counts in communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS active_member_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_member_count INT DEFAULT 0;

-- Add columns for platform fee tracking in community_members table
ALTER TABLE community_members
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create fee changes tracking table first (since other functions depend on it)
CREATE TABLE IF NOT EXISTS fee_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID REFERENCES communities(id),
    previous_member_count INT,
    new_member_count INT,
    new_fee_percentage DECIMAL(4,2),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to calculate platform fee percentage
DROP FUNCTION IF EXISTS calculate_platform_fee_percentage(INT);
CREATE OR REPLACE FUNCTION calculate_platform_fee_percentage(member_count INT)
RETURNS DECIMAL AS $$
BEGIN
  IF member_count <= 50 THEN
    RETURN 8.0;
  ELSIF member_count <= 100 THEN
    RETURN 6.0;
  ELSE
    RETURN 4.0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update community fee tier (drop first, then recreate)
DROP FUNCTION IF EXISTS update_community_fee_tier(UUID);
CREATE OR REPLACE FUNCTION update_community_fee_tier(p_community_id UUID)
RETURNS void AS $$
DECLARE
    new_fee_percentage DECIMAL;
    current_member_count INT;
BEGIN
    -- Get current member count
    SELECT active_member_count INTO current_member_count
    FROM communities
    WHERE id = p_community_id;

    -- Calculate new fee percentage
    SELECT calculate_platform_fee_percentage(current_member_count) INTO new_fee_percentage;

    -- Update fee percentage for all active members
    UPDATE community_members
    SET platform_fee_percentage = new_fee_percentage
    WHERE community_id = p_community_id
    AND status = 'active';

    -- Log the fee change
    INSERT INTO fee_changes (
        community_id,
        previous_member_count,
        new_member_count,
        new_fee_percentage,
        changed_at
    ) VALUES (
        p_community_id,
        current_member_count - 1, -- Previous count
        current_member_count,     -- New count
        new_fee_percentage,
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to update member counts (drop first, then recreate)
DROP FUNCTION IF EXISTS update_community_member_counts() CASCADE;
CREATE OR REPLACE FUNCTION update_community_member_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counts when a new member joins
    UPDATE communities
    SET 
      active_member_count = active_member_count + 1,
      total_member_count = total_member_count + 1
    WHERE id = NEW.community_id;
    
    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(NEW.community_id);
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'inactive' AND OLD.status = 'active') THEN
    -- Decrement active count when a member leaves or becomes inactive
    UPDATE communities
    SET active_member_count = active_member_count - 1
    WHERE id = OLD.community_id;
    
    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(OLD.community_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status = 'inactive' THEN
    -- Increment active count when a member reactivates
    UPDATE communities
    SET active_member_count = active_member_count + 1
    WHERE id = NEW.community_id;
    
    -- Check if this change crosses a tier threshold and update fees
    PERFORM update_community_fee_tier(NEW.community_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member count updates
DROP TRIGGER IF EXISTS update_community_member_counts_trigger ON community_members;
CREATE TRIGGER update_community_member_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_counts();

-- Add test function for fee tiers
DROP FUNCTION IF EXISTS test_fee_tiers(UUID);
CREATE OR REPLACE FUNCTION test_fee_tiers(p_community_id UUID)
RETURNS TABLE (
    test_case TEXT,
    member_count INT,
    fee_percentage DECIMAL
) AS $$
DECLARE
    original_count INT;
BEGIN
    -- Store original count
    SELECT active_member_count INTO original_count
    FROM communities
    WHERE id = p_community_id;

    -- Test Tier 1 (1-50 members)
    UPDATE communities SET active_member_count = 25 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 1 (25 members)';
    member_count := 25;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Test Tier 2 (51-100 members)
    UPDATE communities SET active_member_count = 75 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 2 (75 members)';
    member_count := 75;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Test Tier 3 (101+ members)
    UPDATE communities SET active_member_count = 150 WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
    test_case := 'Tier 3 (150 members)';
    member_count := 150;
    SELECT platform_fee_percentage INTO fee_percentage
    FROM community_members
    WHERE community_id = p_community_id
    AND status = 'active'
    LIMIT 1;
    RETURN NEXT;

    -- Reset to original count
    UPDATE communities SET active_member_count = original_count WHERE id = p_community_id;
    PERFORM update_community_fee_tier(p_community_id);
END;
$$ LANGUAGE plpgsql; 