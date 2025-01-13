-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author JSONB,
    likes TEXT[] DEFAULT ARRAY[]::TEXT[],
    likes_count INTEGER DEFAULT 0
);

-- Add comments_count column to threads table
ALTER TABLE threads
ADD COLUMN comments_count INTEGER DEFAULT 0;

-- Update existing threads to count their comments
UPDATE threads
SET comments_count = (
  SELECT COUNT(*)
  FROM comments
  WHERE comments.thread_id = threads.id
);

-- Create function to maintain comments count
CREATE OR REPLACE FUNCTION update_thread_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE threads
    SET comments_count = comments_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE threads
    SET comments_count = comments_count - 1
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments table
DROP TRIGGER IF EXISTS update_thread_comments_count ON comments;
CREATE TRIGGER update_thread_comments_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_thread_comments_count();

-- Add RLS policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read comments
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
TO public
USING (true);

-- Policy to allow authenticated users to create comments
CREATE POLICY "Authenticated users can create comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow users to update their own comments
CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (user_id = auth.uid()); 