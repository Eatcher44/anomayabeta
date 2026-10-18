CREATE TABLE public.feedback_attempt_windows(user_id uuid PRIMARY KEY,window_start timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0);
GRANT ALL ON public.feedback_attempt_windows TO service_role;
ALTER TABLE public.feedback_attempt_windows ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_feedback_attempt(p_uid uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.feedback_attempt_windows%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) THEN RETURN false; END IF;
INSERT INTO public.feedback_attempt_windows(user_id,window_start,attempts) VALUES(p_uid,clock_timestamp(),0) ON CONFLICT DO NOTHING;
SELECT * INTO w FROM public.feedback_attempt_windows WHERE user_id=p_uid FOR UPDATE;
IF w.window_start+interval '1 hour'<=clock_timestamp() THEN w.attempts:=0; w.window_start:=clock_timestamp(); END IF;
IF w.attempts>=5 THEN RETURN false; END IF;
UPDATE public.feedback_attempt_windows SET attempts=w.attempts+1,window_start=w.window_start WHERE user_id=p_uid;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.consume_feedback_attempt(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_feedback_attempt(uuid) TO service_role;
ALTER TABLE public.breeder_profiles ADD COLUMN signature_object_path text;
CREATE FUNCTION public.guard_private_signature() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NEW.signature_object_path IS NOT NULL AND (split_part(NEW.signature_object_path,'/',1)<>NEW.user_id::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='sensitive-documents' AND name=NEW.signature_object_path AND owner_id=NEW.user_id::text)) THEN RAISE EXCEPTION 'signature_not_owned'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_private_signature() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER security_private_signature BEFORE INSERT OR UPDATE ON public.breeder_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_private_signature();
CREATE POLICY "Owners read private documents" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='sensitive-documents' AND public.security_account_active(auth.uid()) AND split_part(name,'/',1)=auth.uid()::text AND owner_id=auth.uid()::text);
CREATE POLICY "Owners upload private documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='sensitive-documents' AND public.security_upload_allowed(bucket_id,name));
CREATE OR REPLACE FUNCTION public.prepare_account_cleanup(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF public.deletion_has_foreign_relationships(p_uid) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url)
SELECT o.bucket_id,o.name,p_uid,'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||o.bucket_id||'/'||o.name
FROM storage.objects o WHERE o.bucket_id IN('animal-photos','bug-screenshots','sensitive-documents') AND o.owner_id=p_uid::text AND split_part(o.name,'/',1)=p_uid::text
ON CONFLICT(bucket,object_path) DO NOTHING;
result:=public.prepare_secure_account_deletion(p_uid);
IF result ? 'error' THEN RETURN result; END IF;
DELETE FROM public.feedback_attempt_windows WHERE user_id=p_uid;
IF NOT COALESCE((result->>'complete')::boolean,false) THEN
INSERT INTO public.media_cleanup_jobs(media_id,user_id,bucket,object_path) SELECT m.id,p_uid,m.bucket,m.object_path FROM public.trusted_media m WHERE m.custodian_id=p_uid AND m.status='active' AND NOT EXISTS(SELECT 1 FROM public.trusted_media_bindings b WHERE b.media_id=m.id) ON CONFLICT DO NOTHING;
UPDATE public.trusted_media SET status='deleting' WHERE id IN(SELECT media_id FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed);
RETURN jsonb_build_object('files',COALESCE((SELECT jsonb_agg(jsonb_build_object('media_id',media_id,'bucket',bucket,'path',object_path)) FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed),'[]'::jsonb));
END IF;
RETURN result; END $$;