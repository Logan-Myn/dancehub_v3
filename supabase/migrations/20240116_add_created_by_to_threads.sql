-- Add created_by column to threads table
ALTER TABLE threads
ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS threads_created_by_idx ON threads(created_by);

-- Set created_by equal to user_id for existing threads
UPDATE threads
SET created_by = user_id
WHERE created_by IS NULL;

-- Make created_by NOT NULL after migration
ALTER TABLE threads
ALTER COLUMN created_by SET NOT NULL; 