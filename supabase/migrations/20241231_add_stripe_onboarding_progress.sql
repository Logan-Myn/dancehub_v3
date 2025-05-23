-- Create stripe_onboarding_progress table for tracking custom Stripe onboarding
CREATE TABLE stripe_onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  business_info JSONB DEFAULT '{}'::JSONB,
  personal_info JSONB DEFAULT '{}'::JSONB,
  bank_account JSONB DEFAULT '{}'::JSONB,
  documents JSONB DEFAULT '[]'::JSONB,
  verification_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add stripe_onboarding_type column to communities table
ALTER TABLE communities 
ADD COLUMN stripe_onboarding_type TEXT DEFAULT 'express';

-- Create indexes for performance
CREATE INDEX idx_stripe_onboarding_progress_community_id ON stripe_onboarding_progress(community_id);
CREATE INDEX idx_stripe_onboarding_progress_stripe_account_id ON stripe_onboarding_progress(stripe_account_id);
CREATE INDEX idx_communities_stripe_account_id ON communities(stripe_account_id);

-- Add RLS policies
ALTER TABLE stripe_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see onboarding progress for communities they created
CREATE POLICY "Users can view their community onboarding progress" ON stripe_onboarding_progress
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can only update onboarding progress for communities they created  
CREATE POLICY "Users can update their community onboarding progress" ON stripe_onboarding_progress
  FOR ALL USING (
    community_id IN (
      SELECT id FROM communities WHERE created_by = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_onboarding_progress_updated_at 
  BEFORE UPDATE ON stripe_onboarding_progress 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 