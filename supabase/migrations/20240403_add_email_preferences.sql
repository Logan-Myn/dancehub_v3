-- Create email preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  
  -- Transactional emails (always enabled)
  transactional_emails BOOLEAN DEFAULT true NOT NULL,
  
  -- Optional email types
  marketing_emails BOOLEAN DEFAULT true,
  course_announcements BOOLEAN DEFAULT true,
  lesson_reminders BOOLEAN DEFAULT true,
  community_updates BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT false,
  
  -- Unsubscribe token
  unsubscribe_token VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Tracking
  unsubscribed_all BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on user_id
  UNIQUE(user_id),
  UNIQUE(email, unsubscribe_token)
);

-- Create index for faster lookups
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_preferences_email ON email_preferences(email);
CREATE INDEX idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);

-- Create email tracking table
CREATE TABLE IF NOT EXISTS email_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, bounced, failed
  email_type VARCHAR(50) NOT NULL, -- transactional, marketing, course_announcement, etc.
  subject VARCHAR(500),
  
  -- Resend tracking
  resend_email_id VARCHAR(255),
  
  -- Additional data
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email events
CREATE INDEX idx_email_events_user_id ON email_events(user_id);
CREATE INDEX idx_email_events_email ON email_events(email);
CREATE INDEX idx_email_events_event_type ON email_events(event_type);
CREATE INDEX idx_email_events_email_type ON email_events(email_type);
CREATE INDEX idx_email_events_created_at ON email_events(created_at);

-- RLS policies for email_preferences
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
CREATE POLICY "Users can view own email preferences" ON email_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences" ON email_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all email preferences" ON email_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for email_events
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own email events
CREATE POLICY "Users can view own email events" ON email_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all email events" ON email_events
  FOR ALL USING (auth.role() = 'service_role');

-- Function to automatically create email preferences for new users
CREATE OR REPLACE FUNCTION create_email_preferences_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create email preferences when a new user signs up
CREATE TRIGGER create_email_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences_for_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_email_preferences_updated_at();

-- Create email preferences for existing users
INSERT INTO email_preferences (user_id, email)
SELECT id, email FROM auth.users
ON CONFLICT (user_id) DO NOTHING;