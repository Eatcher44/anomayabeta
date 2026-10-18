CREATE OR REPLACE FUNCTION public.finalize_secure_account_deletion(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT EXISTS(SELECT 1 FROM public.account_deletion_state WHERE user_id=p_uid AND phase='prepared') OR EXISTS(SELECT 1 FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed) OR EXISTS(SELECT 1 FROM public.secure_uploads WHERE user_id=p_uid AND state='pending') THEN RAISE EXCEPTION 'cleanup_incomplete'; END IF;
DELETE FROM public.secure_uploads WHERE user_id=p_uid;
UPDATE public.account_deletion_state SET phase='complete' WHERE user_id=p_uid;
DELETE FROM public.upload_deletion_freezes WHERE user_id=p_uid;
END $$;