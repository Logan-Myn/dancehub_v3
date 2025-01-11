-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS chapters_course_id_idx ON chapters(course_id);
CREATE INDEX IF NOT EXISTS chapters_position_idx ON chapters(position);

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Chapters are viewable by everyone"
  ON chapters FOR SELECT
  USING (true);

CREATE POLICY "Chapters can be created by authenticated users"
  ON chapters FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Chapters can be updated by authenticated users"
  ON chapters FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 