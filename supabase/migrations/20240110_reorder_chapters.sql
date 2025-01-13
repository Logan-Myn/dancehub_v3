-- Create a custom type for the chapter order input
CREATE TYPE chapter_order AS (
  chapter_id uuid,
  course_id uuid,
  new_order integer
);

-- Create the stored procedure
CREATE OR REPLACE FUNCTION reorder_chapters(chapter_orders chapter_order[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all chapters in a single transaction
  FOR i IN 1..array_length(chapter_orders, 1) LOOP
    UPDATE chapters
    SET 
      "order" = (chapter_orders[i]).new_order,
      updated_at = NOW()
    WHERE 
      id = (chapter_orders[i]).chapter_id
      AND course_id = (chapter_orders[i]).course_id;
  END LOOP;
END;
$$; 