-- Create private_lessons table
CREATE TABLE private_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  regular_price DECIMAL(10,2) NOT NULL CHECK (regular_price >= 0),
  member_price DECIMAL(10,2) CHECK (member_price >= 0 AND member_price <= regular_price),
  member_discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN member_price IS NOT NULL AND regular_price > 0 
      THEN ROUND(((regular_price - member_price) / regular_price * 100), 2)
      ELSE 0 
    END
  ) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  max_bookings_per_month INTEGER,
  requirements TEXT,
  location_type TEXT DEFAULT 'online' CHECK (location_type IN ('online', 'in_person', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lesson_bookings table
CREATE TABLE lesson_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  private_lesson_id UUID NOT NULL REFERENCES private_lessons(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT,
  is_community_member BOOLEAN DEFAULT FALSE,
  price_paid DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'canceled')),
  lesson_status TEXT DEFAULT 'booked' CHECK (lesson_status IN ('booked', 'scheduled', 'completed', 'canceled')),
  scheduled_at TIMESTAMPTZ,
  student_message TEXT,
  teacher_notes TEXT,
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_private_lessons_community_id ON private_lessons(community_id);
CREATE INDEX idx_private_lessons_active ON private_lessons(is_active);
CREATE INDEX idx_lesson_bookings_private_lesson_id ON lesson_bookings(private_lesson_id);
CREATE INDEX idx_lesson_bookings_student_id ON lesson_bookings(student_id);
CREATE INDEX idx_lesson_bookings_community_id ON lesson_bookings(community_id);
CREATE INDEX idx_lesson_bookings_payment_intent ON lesson_bookings(stripe_payment_intent_id);
CREATE INDEX idx_lesson_bookings_status ON lesson_bookings(payment_status, lesson_status);

-- Add update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_private_lessons_updated_at
    BEFORE UPDATE ON private_lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_bookings_updated_at
    BEFORE UPDATE ON lesson_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE private_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_lessons
-- Anyone can view active private lessons
CREATE POLICY "Anyone can view active private lessons" ON private_lessons
  FOR SELECT USING (is_active = true);

-- Community creators can manage their private lessons
CREATE POLICY "Community creators can manage their private lessons" ON private_lessons
  FOR ALL USING (
    community_id IN (
      SELECT id FROM communities WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for lesson_bookings
-- Students can view their own bookings
CREATE POLICY "Students can view their own bookings" ON lesson_bookings
  FOR SELECT USING (student_id = auth.uid());

-- Community creators can view bookings for their lessons
CREATE POLICY "Teachers can view bookings for their lessons" ON lesson_bookings
  FOR SELECT USING (
    community_id IN (
      SELECT id FROM communities WHERE created_by = auth.uid()
    )
  );

-- Students can create bookings
CREATE POLICY "Students can create bookings" ON lesson_bookings
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers can update booking status and notes
CREATE POLICY "Teachers can update their lesson bookings" ON lesson_bookings
  FOR UPDATE USING (
    community_id IN (
      SELECT id FROM communities WHERE created_by = auth.uid()
    )
  );

-- Create view for lesson bookings with lesson details
CREATE VIEW lesson_bookings_with_details AS
SELECT 
  lb.*,
  pl.title as lesson_title,
  pl.description as lesson_description,
  pl.duration_minutes,
  pl.regular_price,
  pl.member_price,
  c.name as community_name,
  c.slug as community_slug,
  p.full_name as student_full_name,
  p.display_name as student_display_name
FROM lesson_bookings lb
JOIN private_lessons pl ON lb.private_lesson_id = pl.id
JOIN communities c ON lb.community_id = c.id
LEFT JOIN profiles p ON lb.student_id = p.id; 