-- Add promotional period columns to communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS promotional_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotional_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotional_fee_percentage DECIMAL(4,2) DEFAULT 0.0;

-- Add promotional period columns to community_members table
ALTER TABLE community_members
ADD COLUMN IF NOT EXISTS is_promotional_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS promotional_period_end TIMESTAMP WITH TIME ZONE;

-- Update the calculate_platform_fee_percentage function to handle promotional periods
CREATE OR REPLACE FUNCTION calculate_platform_fee_percentage_with_promo(
    member_count INT,
    is_promotional BOOLEAN DEFAULT FALSE,
    promotional_fee DECIMAL DEFAULT 0.0
)
RETURNS DECIMAL AS $$
BEGIN
  -- If it's during promotional period, return promotional fee
  IF is_promotional THEN
    RETURN promotional_fee;
  END IF;
  
  -- Otherwise use standard tiered pricing
  IF member_count <= 50 THEN
    RETURN 8.0;
  ELSIF member_count <= 100 THEN
    RETURN 6.0;
  ELSE
    RETURN 4.0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if member should get promotional pricing
CREATE OR REPLACE FUNCTION is_member_in_promotional_period(
    community_created_at TIMESTAMP WITH TIME ZONE,
    member_joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    promotional_duration_days INT DEFAULT 30
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if member joined within promotional period of community creation
    RETURN member_joined_at <= (community_created_at + INTERVAL '1 day' * promotional_duration_days);
END;
$$ LANGUAGE plpgsql;

-- Update existing function to handle promotional pricing
CREATE OR REPLACE FUNCTION update_community_fee_tier(p_community_id UUID)
RETURNS void AS $$
DECLARE
    new_fee_percentage DECIMAL;
    current_member_count INT;
    community_created_at TIMESTAMP WITH TIME ZONE;
    promo_fee DECIMAL;
BEGIN
    -- Get current member count and community creation date
    SELECT active_member_count, created_at, promotional_fee_percentage
    INTO current_member_count, community_created_at, promo_fee
    FROM communities
    WHERE id = p_community_id;

    -- Calculate new fee percentage (standard tiered pricing)
    SELECT calculate_platform_fee_percentage(current_member_count) INTO new_fee_percentage;

    -- Update all current members' fee percentages
    -- Members in promotional period keep 0% fee, others get tiered pricing
    UPDATE community_members
    SET platform_fee_percentage = CASE
        WHEN is_promotional_member AND promotional_period_end > CURRENT_TIMESTAMP THEN promo_fee
        ELSE new_fee_percentage
    END
    WHERE community_id = p_community_id;

    -- Log the fee change
    INSERT INTO fee_changes (community_id, new_member_count, new_fee_percentage)
    VALUES (p_community_id, current_member_count, new_fee_percentage);
END;
$$ LANGUAGE plpgsql;
