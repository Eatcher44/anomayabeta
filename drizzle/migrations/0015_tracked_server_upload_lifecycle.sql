CREATE TABLE public.secure_uploads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,bucket text NOT NULL,object_path text NOT NULL UNIQUE,state text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT secure_upload_state CHECK(state IN('pending','complete','removed')),CONSTRAINT secure_upload_bucket CHECK(bucket IN('animal-photos','bug-screenshots','sensitive-documents')));
GRANT ALL ON public.secure_uploads TO service_role;
ALTER TABLE public.secure_uploads ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.upload_deletion_freezes(user_id uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.upload_deletion_freezes TO service_role;
ALTER TABLE public.upload_deletion_freezes ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.reserve_secure_upload(p_uid uuid,p_bucket text,p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path) VALUES(p_uid,p_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path); END $$;
REVOKE ALL ON FUNCTION public.reserve_secure_upload(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_secure_upload(uuid,text,text) TO service_role;
CREATE FUNCTION public.settle_secure_upload(p_uid uuid,p_ticket uuid,p_removed boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; u text; BEGIN
PERFORM public.security_mutation_lock();
SELECT * INTO t FROM public.secure_uploads WHERE id=p_ticket AND user_id=p_uid FOR UPDATE;
IF NOT FOUND OR t.state<>'pending' THEN RAISE EXCEPTION 'invalid_upload_ticket'; END IF;
IF p_removed THEN
IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=t.bucket AND name=t.object_path) THEN RAISE EXCEPTION 'file_still_present'; END IF;
UPDATE public.secure_uploads SET state='removed' WHERE id=t.id;
RETURN jsonb_build_object('removed',true); END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=t.bucket AND name=t.object_path) THEN RAISE EXCEPTION 'upload_not_committed'; END IF;
IF EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) OR NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('discard',true); END IF;
u:='https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||t.bucket||'/'||t.object_path;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url) VALUES(t.bucket,t.object_path,p_uid,u);
UPDATE public.secure_uploads SET state='complete' WHERE id=t.id;
RETURN jsonb_build_object('url',u); END $$;
REVOKE ALL ON FUNCTION public.settle_secure_upload(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_secure_upload(uuid,uuid,boolean) TO service_role;
CREATE FUNCTION public.freeze_secure_uploads(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF public.deletion_has_foreign_relationships(p_uid) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
INSERT INTO public.upload_deletion_freezes(user_id) VALUES(p_uid) ON CONFLICT DO NOTHING;
RETURN jsonb_build_object('pending',EXISTS(SELECT 1 FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')); END $$;
REVOKE ALL ON FUNCTION public.freeze_secure_uploads(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_secure_uploads(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.finalize_secure_account_deletion(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT EXISTS(SELECT 1 FROM public.account_deletion_state WHERE user_id=p_uid AND phase='prepared') OR EXISTS(SELECT 1 FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed) OR EXISTS(SELECT 1 FROM public.secure_uploads WHERE user_id=p_uid AND state='pending') THEN RAISE EXCEPTION 'cleanup_incomplete'; END IF;
DELETE FROM public.secure_uploads WHERE user_id=p_uid;
UPDATE public.account_deletion_state SET phase='complete' WHERE user_id=p_uid;
END $$;
COMMENT ON TABLE public.secure_uploads IS 'Durable pre-Storage tickets; unresolved commits block deletion with no timeout-based release. Direct legacy client uploads must be retired in a coordinated approved frontend rollout.';