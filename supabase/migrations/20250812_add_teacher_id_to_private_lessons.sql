-- Add teacher_id to private_lessons table to connect lessons to specific teachers
ALTER TABLE private_lessons
ADD COLUMN teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing private lessons to use the community creator as the teacher
UPDATE private_lessons 
SET teacher_id = communities.created_by
FROM communities 
WHERE private_lessons.community_id = communities.id;

-- Make teacher_id NOT NULL now that we've populated it
ALTER TABLE private_lessons
ALTER COLUMN teacher_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_private_lessons_teacher_id ON private_lessons(teacher_id);

-- Update RLS policies if needed
-- Note: Existing policies should still work since we're not changing the structure dramatically
