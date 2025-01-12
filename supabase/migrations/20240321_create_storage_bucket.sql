-- Create the community-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'community-images'
        AND auth.role() = 'authenticated'
    );

-- Set up storage policy to allow public viewing
CREATE POLICY "Allow public viewing" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'community-images');

-- Set up storage policy to allow owners to update and delete their images
CREATE POLICY "Allow owners to update and delete" ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'community-images' 
           AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'community-images' 
                AND (storage.foldername(name))[1] = auth.uid()::text); 