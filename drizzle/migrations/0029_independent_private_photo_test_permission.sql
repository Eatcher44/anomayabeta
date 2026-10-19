ALTER TABLE public.security_release_state ADD COLUMN private_photo_test_users uuid[] NOT NULL DEFAULT '{}'::uuid[];
COMMENT ON COLUMN public.security_release_state.private_photo_test_users IS 'Service-controlled private-photo-only test identities; never authorizes transfer or deletion.';
CREATE OR REPLACE FUNCTION public.security_feature_allowed(p_uid uuid, p_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public, pg_temp AS $function$
SELECT EXISTS(SELECT 1 FROM public.security_release_state WHERE id AND CASE p_feature WHEN 'private_photos' THEN private_photos_enabled OR p_uid=ANY(private_photo_test_users) WHEN 'transfer' THEN transfers_enabled OR p_uid=ANY(test_users) WHEN 'deletion' THEN deletion_enabled OR p_uid=ANY(test_users) ELSE false END) $function$;
CREATE OR REPLACE FUNCTION public.reserve_secure_upload_v2(p_uid uuid, p_bucket text, p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $function$
DECLARE t public.secure_uploads%ROWTYPE; target_bucket text := p_bucket; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents','animal-media') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF p_bucket='animal-photos' AND public.security_feature_allowed(p_uid,'private_photos') THEN target_bucket := 'animal-media'; END IF;
IF target_bucket='animal-media' AND NOT public.security_feature_allowed(p_uid,'private_photos') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path,write_started) VALUES(p_uid,target_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext,false) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path,'bucket',t.bucket); END $function$;