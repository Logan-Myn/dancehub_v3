-- Create live classes tables for calendar functionality
-- This enables teachers to schedule live online dance classes with Daily.co integration

-- Live classes table
CREATE TABLE live_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  daily_room_name TEXT,
  daily_room_url TEXT,
  daily_room_token_teacher TEXT,
  daily_room_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live class participants tracking table
CREATE TABLE live_class_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_live_classes_community_id ON live_classes(community_id);
CREATE INDEX idx_live_classes_teacher_id ON live_classes(teacher_id);
CREATE INDEX idx_live_classes_scheduled_start_time ON live_classes(scheduled_start_time);
CREATE INDEX idx_live_classes_status ON live_classes(status);
CREATE INDEX idx_live_class_participants_class_id ON live_class_participants(live_class_id);
CREATE INDEX idx_live_class_participants_student_id ON live_class_participants(student_id);

-- Unique constraint to prevent duplicate participation records
CREATE UNIQUE INDEX idx_live_class_participants_unique ON live_class_participants(live_class_id, student_id) 
WHERE left_at IS NULL;

-- Updated at trigger for live_classes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_classes_updated_at 
  BEFORE UPDATE ON live_classes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for live classes with teacher and community details
CREATE VIEW live_classes_with_details AS
SELECT 
  lc.*,
  p.display_name as teacher_name,
  p.avatar_url as teacher_avatar_url,
  c.name as community_name,
  c.slug as community_slug,
  -- Calculate if class is currently active (within scheduled time + duration)
  CASE 
    WHEN NOW() >= lc.scheduled_start_time AND NOW() <= (lc.scheduled_start_time + INTERVAL '1 minute' * lc.duration_minutes)
    THEN true 
    ELSE false 
  END as is_currently_active,
  -- Calculate if class is starting soon (within 15 minutes)
  CASE 
    WHEN lc.scheduled_start_time <= (NOW() + INTERVAL '15 minutes') AND lc.scheduled_start_time > NOW()
    THEN true 
    ELSE false 
  END as is_starting_soon
FROM live_classes lc
JOIN profiles p ON lc.teacher_id = p.id
JOIN communities c ON lc.community_id = c.id;

-- Row Level Security policies
ALTER TABLE live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_participants ENABLE ROW LEVEL SECURITY;

-- Policies for live_classes table
-- Teachers can manage their own live classes
CREATE POLICY "Teachers can manage their live classes" ON live_classes
  FOR ALL USING (
    auth.uid() = teacher_id OR 
    EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_id AND created_by = auth.uid()
    )
  );

-- Community members can view live classes in their communities
CREATE POLICY "Community members can view live classes" ON live_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = live_classes.community_id 
      AND cm.user_id = auth.uid() 
      AND cm.status = 'active'
    )
    OR
    -- Community creators can always see
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = live_classes.community_id 
      AND c.created_by = auth.uid()
    )
  );

-- Policies for live_class_participants table
-- Students can manage their own participation
CREATE POLICY "Students can manage their participation" ON live_class_participants
  FOR ALL USING (auth.uid() = student_id);

-- Teachers can view participants in their classes
CREATE POLICY "Teachers can view participants" ON live_class_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_classes lc
      WHERE lc.id = live_class_participants.live_class_id 
      AND lc.teacher_id = auth.uid()
    )
  );

-- Community creators can view all participants
CREATE POLICY "Community creators can view participants" ON live_class_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM live_classes lc
      JOIN communities c ON lc.community_id = c.id
      WHERE lc.id = live_class_participants.live_class_id 
      AND c.created_by = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE live_classes IS 'Live online dance classes scheduled by teachers in communities';
COMMENT ON COLUMN live_classes.daily_room_name IS 'Daily.co room name for video session';
COMMENT ON COLUMN live_classes.daily_room_url IS 'Full Daily.co room URL for joining';
COMMENT ON COLUMN live_classes.daily_room_token_teacher IS 'Pre-generated Daily.co token for teacher (host privileges)';
COMMENT ON COLUMN live_classes.daily_room_expires_at IS 'When the Daily.co room expires (scheduled_start_time + duration + buffer)';
COMMENT ON COLUMN live_classes.status IS 'Class status: scheduled (not started), live (currently active), ended (finished), cancelled (teacher cancelled)';

COMMENT ON TABLE live_class_participants IS 'Tracks which students participate in live classes';
COMMENT ON COLUMN live_class_participants.joined_at IS 'When student joined the video session';
COMMENT ON COLUMN live_class_participants.left_at IS 'When student left the video session (NULL if still in session)';