-- Add author info columns to threads table
ALTER TABLE threads
ADD COLUMN author_name text,
ADD COLUMN author_image text; 