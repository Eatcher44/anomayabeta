ALTER POLICY "Users can update their own animal photos" ON storage.objects USING (false) WITH CHECK (false);
ALTER POLICY "Users can delete their own animal photos" ON storage.objects USING (false);