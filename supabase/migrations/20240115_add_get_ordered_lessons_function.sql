-- Create a function to get ordered lessons for a course
CREATE OR REPLACE FUNCTION get_ordered_lessons(course_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  video_asset_id TEXT,
  playback_id TEXT,
  lesson_position INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  chapter_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.content,
    l.video_asset_id,
    l.playback_id,
    l.lesson_position,
    l.created_at,
    l.updated_at,
    l.created_by,
    l.chapter_id
  FROM lessons l
  JOIN chapters c ON l.chapter_id = c.id
  WHERE c.course_id = course_id_param
  ORDER BY c.chapter_position ASC, l.lesson_position ASC;
END;
$$ LANGUAGE plpgsql; 