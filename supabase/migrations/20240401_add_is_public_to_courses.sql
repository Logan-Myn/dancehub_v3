-- Add is_public column to courses table with a default value of true
ALTER TABLE courses
ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Add comment to explain the column's purpose
COMMENT ON COLUMN courses.is_public IS 'Indicates whether the course is publicly accessible or private'; 