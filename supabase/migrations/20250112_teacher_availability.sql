-- Create teacher availability slots table
CREATE TABLE teacher_availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Prevent overlapping slots for same teacher/day
  EXCLUDE USING gist (
    teacher_id WITH =,
    community_id WITH =,
    day_of_week WITH =,
    tsrange(start_time::text::time, end_time::text::time, '[)') WITH &&
  ) WHERE (is_active = true)
);

-- Create indexes for better performance
CREATE INDEX idx_teacher_availability_teacher_id ON teacher_availability_slots(teacher_id);
CREATE INDEX idx_teacher_availability_community_id ON teacher_availability_slots(community_id);
CREATE INDEX idx_teacher_availability_day_of_week ON teacher_availability_slots(day_of_week);
CREATE INDEX idx_teacher_availability_active ON teacher_availability_slots(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE teacher_availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Teachers can manage their own availability" ON teacher_availability_slots
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Community members can view teacher availability" ON teacher_availability_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = teacher_availability_slots.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_teacher_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_teacher_availability_updated_at
  BEFORE UPDATE ON teacher_availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_availability_updated_at();

-- Add a helper view for easier querying
CREATE VIEW teacher_availability_with_details AS
SELECT 
  tas.*,
  p.full_name as teacher_name,
  p.avatar_url as teacher_avatar,
  c.name as community_name,
  c.slug as community_slug,
  CASE tas.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_name
FROM teacher_availability_slots tas
JOIN profiles p ON p.id = tas.teacher_id
JOIN communities c ON c.id = tas.community_id;
