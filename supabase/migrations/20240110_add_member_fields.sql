-- Add new columns to members table
ALTER TABLE members
ADD COLUMN role text NOT NULL DEFAULT 'member',
ADD COLUMN joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add check constraint for role values
ALTER TABLE members
ADD CONSTRAINT valid_role CHECK (role IN ('member', 'admin', 'moderator')); 