
-- Create storage bucket for animal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('animal-photos', 'animal-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload animal photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'animal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Animal photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'animal-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update their own animal photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'animal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own animal photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'animal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
