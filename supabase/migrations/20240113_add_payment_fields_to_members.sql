-- Add payment-related fields to community_members table
ALTER TABLE community_members
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_community_members_payment_intent_id ON community_members(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_community_members_subscription_id ON community_members(subscription_id);

-- Add constraint for subscription status
ALTER TABLE community_members
ADD CONSTRAINT valid_subscription_status 
CHECK (subscription_status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')); 