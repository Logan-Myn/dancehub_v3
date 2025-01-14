-- Add pinned column to threads table
ALTER TABLE threads
ADD COLUMN pinned boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS threads_pinned_idx ON threads(pinned);

-- Add policy for pinning threads (only community creator can pin)
CREATE POLICY "Only community creator can pin threads"
ON threads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = threads.community_id
    AND communities.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = threads.community_id
    AND communities.created_by = auth.uid()
  )
); 