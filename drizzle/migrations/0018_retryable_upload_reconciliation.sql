ALTER TABLE public.secure_uploads ADD COLUMN write_started boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.secure_uploads.write_started IS 'Historical tickets conservatively uncertain; new tickets start false. Never infer write completion from elapsed time or absent Storage metadata.';
CREATE OR REPLACE FUNCTION public.reserve_secure_upload(p_uid uuid,p_bucket text,p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path,write_started) VALUES(p_uid,p_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext,false) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path); END $$;
CREATE FUNCTION public.begin_secure_upload(p_uid uuid,p_ticket uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN false; END IF;
UPDATE public.secure_uploads SET write_started=true WHERE id=p_ticket AND user_id=p_uid AND state='pending' AND NOT write_started;
RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.begin_secure_upload(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_secure_upload(uuid,uuid) TO service_role;
CREATE FUNCTION public.list_pending_secure_uploads(p_uid uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id)),'[]'::jsonb) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending' $$;
REVOKE ALL ON FUNCTION public.list_pending_secure_uploads(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_secure_uploads(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.settle_secure_upload(p_uid uuid,p_ticket uuid,p_removed boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; m public.trusted_media%ROWTYPE; present boolean; u text; BEGIN
PERFORM public.security_mutation_lock();
SELECT * INTO t FROM public.secure_uploads WHERE id=p_ticket AND user_id=p_uid FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'invalid_upload_ticket'; END IF;
IF t.state='removed' THEN RETURN jsonb_build_object('removed',true); END IF;
u:='https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||t.bucket||'/'||t.object_path;
IF t.state='complete' THEN RETURN jsonb_build_object('url',u,'complete',true); END IF;
SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=t.bucket AND name=t.object_path) INTO present;
SELECT * INTO m FROM public.trusted_media WHERE bucket=t.bucket AND object_path=t.object_path FOR UPDATE;
IF EXISTS(SELECT 1 FROM public.trusted_media_bindings WHERE media_id=m.id) THEN
IF m.status<>'active' OR NOT present THEN RETURN jsonb_build_object('pending',true); END IF;
UPDATE public.secure_uploads SET state='complete' WHERE id=t.id;
RETURN jsonb_build_object('preserved',true,'complete',true); END IF;
IF NOT present THEN
-- A previously started write can still commit. Only no-start or a registered cleanup is conclusive.
IF NOT t.write_started OR (p_removed AND m.status='deleting') THEN
UPDATE public.secure_uploads SET state='removed' WHERE id=t.id;
UPDATE public.trusted_media SET status='deleted' WHERE id=m.id;
RETURN jsonb_build_object('removed',true); END IF;
RETURN jsonb_build_object('pending',true); END IF;
IF EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) OR NOT public.security_account_active(p_uid) THEN
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url,status) VALUES(t.bucket,t.object_path,p_uid,u,'deleting') ON CONFLICT(bucket,object_path) DO NOTHING;
UPDATE public.trusted_media SET status='deleting' WHERE bucket=t.bucket AND object_path=t.object_path;
-- Immutable server-issued path, upsert:false and one-shot begin: observing its commit excludes a second writer.
RETURN jsonb_build_object('discard',true,'bucket',t.bucket,'path',t.object_path); END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url) VALUES(t.bucket,t.object_path,p_uid,u) ON CONFLICT(bucket,object_path) DO NOTHING;
IF m.status IS NOT NULL AND m.status<>'active' THEN RETURN jsonb_build_object('pending',true); END IF;
UPDATE public.secure_uploads SET state='complete' WHERE id=t.id;
RETURN jsonb_build_object('url',u,'complete',true); END $$;