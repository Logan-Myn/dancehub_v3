-- First check if the old columns exist and new columns don't exist
DO $$ 
BEGIN
    -- For lessons table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lessons' 
        AND column_name = 'position'
    ) THEN
        ALTER TABLE lessons RENAME COLUMN "position" TO lesson_position;
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'lessons' 
        AND column_name = 'lesson_position'
    ) THEN
        ALTER TABLE lessons ADD COLUMN lesson_position INTEGER DEFAULT 0;
    END IF;

    -- For chapters table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chapters' 
        AND column_name = 'position'
    ) THEN
        ALTER TABLE chapters RENAME COLUMN "position" TO chapter_position;
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chapters' 
        AND column_name = 'chapter_position'
    ) THEN
        ALTER TABLE chapters ADD COLUMN chapter_position INTEGER DEFAULT 0;
    END IF;
END $$; 