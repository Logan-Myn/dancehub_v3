-- Add foreign key constraint between threads and profiles
ALTER TABLE threads
ADD CONSTRAINT fk_threads_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE; 