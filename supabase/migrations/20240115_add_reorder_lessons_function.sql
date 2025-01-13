-- Create a function to reorder lessons
CREATE OR REPLACE FUNCTION reorder_lessons(
  chapter_id_param UUID,
  lesson_positions JSON[]
)
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
DECLARE
  lesson_data JSON;
BEGIN
  -- Update positions in a transaction
  FOR lesson_data IN SELECT * FROM json_array_elements(lesson_positions::json)
  LOOP
    UPDATE lessons
    SET 
      lesson_position = (lesson_data->>'position')::INTEGER,
      updated_at = NOW()
    WHERE id = (lesson_data->>'id')::UUID
    AND chapter_id = chapter_id_param;
  END LOOP;

  -- Return the updated lessons
  RETURN QUERY
  SELECT *
  FROM lessons
  WHERE chapter_id = chapter_id_param
  ORDER BY lesson_position ASC;
END;
$$ LANGUAGE plpgsql; 