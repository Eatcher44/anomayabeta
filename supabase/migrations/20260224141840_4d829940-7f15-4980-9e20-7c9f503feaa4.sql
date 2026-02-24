
-- Create storage bucket for bug screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('bug-screenshots', 'bug-screenshots', true);

-- Allow authenticated users to upload
CREATE POLICY "Users can upload bug screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bug-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access
CREATE POLICY "Bug screenshots are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'bug-screenshots');
