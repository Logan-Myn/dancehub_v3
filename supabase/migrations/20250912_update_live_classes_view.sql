-- Update the live_classes_with_details view to include community_created_by field
DROP VIEW IF EXISTS live_classes_with_details;

CREATE VIEW live_classes_with_details AS
SELECT 
  lc.*,
  p.display_name as teacher_name,
  p.avatar_url as teacher_avatar_url,
  c.name as community_name,
  c.slug as community_slug,
  c.created_by as community_created_by, -- Added this field
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