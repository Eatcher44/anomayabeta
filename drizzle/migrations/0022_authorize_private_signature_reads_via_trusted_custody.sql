CREATE OR REPLACE FUNCTION public.security_private_document_read_allowed(p_bucket text, p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_bucket = 'sensitive-documents'
    AND auth.uid() IS NOT NULL
    AND public.security_account_active(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.trusted_media m
      WHERE m.bucket = p_bucket AND m.object_path = p_path
        AND m.custodian_id = auth.uid() AND m.status = 'active'
    )
$$;
REVOKE ALL ON FUNCTION public.security_private_document_read_allowed(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_private_document_read_allowed(text,text) TO authenticated, service_role;
ALTER POLICY "Owners read server uploaded private documents" ON storage.objects
TO authenticated
USING (bucket_id = 'sensitive-documents' AND public.security_private_document_read_allowed(bucket_id, name));
COMMENT ON FUNCTION public.security_private_document_read_allowed(text,text) IS 'Authorizes exact active server-issued private document custody using the verified session; no registry exposure or client ownership assertion.';