-- Create a custom type for the lesson order input
CREATE TYPE lesson_order AS (
  lesson_id uuid,
  chapter_id uuid,
  new_order integer
);

-- Create the stored procedure
CREATE OR REPLACE FUNCTION reorder_lessons(lesson_orders lesson_order[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update all lessons in a single transaction
  FOR i IN 1..array_length(lesson_orders, 1) LOOP
    UPDATE lessons
    SET 
      "order" = (lesson_orders[i]).new_order,
      updated_at = NOW()
    WHERE 
      id = (lesson_orders[i]).lesson_id
      AND chapter_id = (lesson_orders[i]).chapter_id;
  END LOOP;
END;
$$; 