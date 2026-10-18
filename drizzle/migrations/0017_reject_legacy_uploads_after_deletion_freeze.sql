CREATE OR REPLACE FUNCTION public.security_upload_allowed(p_bucket text,p_path text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
RETURN auth.uid() IS NOT NULL AND public.security_account_active(auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=auth.uid()) AND split_part(p_path,'/',1)=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.trusted_media WHERE bucket=p_bucket AND object_path=p_path);
END $$;