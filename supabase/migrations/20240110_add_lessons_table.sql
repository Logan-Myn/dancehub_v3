-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  video_asset_id TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS lessons_chapter_id_idx ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS lessons_position_idx ON lessons(position);

-- Enable RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Lessons are viewable by everyone"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "Lessons can be created by authenticated users"
  ON lessons FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Lessons can be updated by authenticated users"
  ON lessons FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 