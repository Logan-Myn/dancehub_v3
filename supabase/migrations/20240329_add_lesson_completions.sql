-- Create lesson_completions table
CREATE TABLE lesson_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Add RLS policies
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own lesson completions
CREATE POLICY "Users can view their own lesson completions"
    ON lesson_completions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own lesson completions
CREATE POLICY "Users can insert their own lesson completions"
    ON lesson_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own lesson completions
CREATE POLICY "Users can delete their own lesson completions"
    ON lesson_completions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_lesson_completions_user_lesson ON lesson_completions(user_id, lesson_id); 