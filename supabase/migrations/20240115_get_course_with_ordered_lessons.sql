CREATE OR REPLACE FUNCTION get_course_with_ordered_lessons(
  p_community_slug text,
  p_course_slug text
)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'slug', c.slug,
      'chapters', (
        SELECT json_agg(
          json_build_object(
            'id', ch.id,
            'title', ch.title,
            'position', ch.position,
            'lessons', (
              SELECT json_agg(
                json_build_object(
                  'id', l.id,
                  'title', l.title,
                  'content', l.content,
                  'video_asset_id', l.video_asset_id,
                  'playback_id', l.playback_id,
                  'position', l.position,
                  'created_at', l.created_at,
                  'updated_at', l.updated_at,
                  'created_by', l.created_by
                )
                ORDER BY l.position
              )
              FROM lessons l
              WHERE l.chapter_id = ch.id
            )
          )
          ORDER BY ch.position
        )
        FROM chapters ch
        WHERE ch.course_id = c.id
      )
    )
    FROM courses c
    JOIN communities comm ON c.community_id = comm.id
    WHERE comm.slug = p_community_slug
    AND c.slug = p_course_slug
    LIMIT 1
  );
END;
$$; 