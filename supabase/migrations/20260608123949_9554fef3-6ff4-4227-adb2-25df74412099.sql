DROP POLICY IF EXISTS "Bug screenshots are publicly accessible" ON storage.objects;
CREATE POLICY "Users can read their own bug screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);