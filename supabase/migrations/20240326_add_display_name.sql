-- Add display_name column to profiles table
ALTER TABLE profiles
ADD COLUMN display_name TEXT;

-- Create a unique index for display_name
CREATE UNIQUE INDEX profiles_display_name_key ON profiles(display_name) WHERE display_name IS NOT NULL;

-- Add a function to format display names
CREATE OR REPLACE FUNCTION format_display_name(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF full_name IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN SPLIT_PART(full_name, ' ', 1) || ' ' || 
           LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.';
END;
$$ LANGUAGE plpgsql;

-- Add a function to get display name or formatted full name
CREATE OR REPLACE FUNCTION get_display_name(p_display_name TEXT, p_full_name TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Return display_name if set, otherwise return formatted full_name
    RETURN COALESCE(p_display_name, 
        CASE 
            WHEN p_full_name IS NOT NULL THEN 
                format_display_name(p_full_name)
            ELSE 
                NULL
        END
    );
END;
$$ LANGUAGE plpgsql; 