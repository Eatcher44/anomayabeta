CREATE FUNCTION public.reserve_secure_upload_v2(p_uid uuid,p_bucket text,p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path,write_started) VALUES(p_uid,p_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext,false) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path); END $$;
REVOKE ALL ON FUNCTION public.reserve_secure_upload_v2(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_secure_upload_v2(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_secure_upload(p_uid uuid,p_bucket text,p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path,write_started) VALUES(p_uid,p_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext,true) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path); END $$;