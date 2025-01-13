-- Add Stripe-related fields to communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS membership_price DECIMAL(10,2);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_communities_stripe_account_id ON communities(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_communities_stripe_product_id ON communities(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_communities_stripe_price_id ON communities(stripe_price_id); 