-- Add category columns to threads table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threads' AND column_name = 'category_id') THEN
        ALTER TABLE threads ADD COLUMN category_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threads' AND column_name = 'category_name') THEN
        ALTER TABLE threads ADD COLUMN category_name text;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create threads" ON threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON threads;

-- Create new policies with updated conditions
CREATE POLICY "Authenticated users can create threads"
ON threads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (category_id IS NOT NULL AND category_name IS NOT NULL)
);

CREATE POLICY "Users can update their own threads"
ON threads
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  (category_id IS NOT NULL AND category_name IS NOT NULL)
); 