ALTER TABLE public.trusted_media DROP CONSTRAINT trusted_media_bucket_check;
ALTER TABLE public.trusted_media ADD CONSTRAINT trusted_media_bucket_check CHECK (bucket = ANY (ARRAY['animal-photos','bug-screenshots','sensitive-documents','animal-media']));
ALTER TABLE public.secure_uploads DROP CONSTRAINT secure_upload_bucket;
ALTER TABLE public.secure_uploads ADD CONSTRAINT secure_upload_bucket CHECK (bucket = ANY (ARRAY['animal-photos','bug-screenshots','sensitive-documents','animal-media']));