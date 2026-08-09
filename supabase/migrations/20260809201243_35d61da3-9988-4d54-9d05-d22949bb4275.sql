DROP POLICY IF EXISTS "Animal photos are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list their own animal photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'animal-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);