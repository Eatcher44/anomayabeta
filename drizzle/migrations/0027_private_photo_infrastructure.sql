ALTER TABLE public.security_release_state ADD COLUMN IF NOT EXISTS private_photos_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.security_feature_allowed(p_uid uuid, p_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT EXISTS(SELECT 1 FROM public.security_release_state WHERE id AND (p_uid=ANY(test_users) OR CASE p_feature WHEN 'transfer' THEN transfers_enabled WHEN 'deletion' THEN deletion_enabled WHEN 'private_photos' THEN private_photos_enabled ELSE false END)) $$;

CREATE OR REPLACE FUNCTION public.reserve_secure_upload_v2(p_uid uuid, p_bucket text, p_ext text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ DECLARE t public.secure_uploads%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_account_active(p_uid) OR EXISTS(SELECT 1 FROM public.upload_deletion_freezes WHERE user_id=p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF p_bucket NOT IN('animal-photos','bug-screenshots','sensitive-documents','animal-media') OR p_ext NOT IN('png','jpg','webp') THEN RAISE EXCEPTION 'invalid_upload'; END IF;
IF p_bucket='animal-media' AND NOT public.security_feature_allowed(p_uid,'private_photos') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF (SELECT count(*) FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')>=5 THEN RETURN jsonb_build_object('error','pending_upload_limit'); END IF;
INSERT INTO public.secure_uploads(user_id,bucket,object_path,write_started) VALUES(p_uid,p_bucket,p_uid::text||'/'||gen_random_uuid()::text||'.'||p_ext,false) RETURNING * INTO t;
RETURN jsonb_build_object('id',t.id,'path',t.object_path); END $$;

-- Read: current custodian or holder of a trusted binding (e.g. the sender's own transfer archive).
CREATE OR REPLACE FUNCTION public.security_private_media_read_allowed(p_bucket text, p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT p_bucket='animal-media' AND auth.uid() IS NOT NULL AND public.security_account_active(auth.uid()) AND public.security_feature_allowed(auth.uid(),'private_photos')
AND EXISTS(SELECT 1 FROM public.trusted_media m WHERE m.bucket=p_bucket AND m.object_path=p_path AND m.status='active'
 AND (m.custodian_id=auth.uid() OR EXISTS(SELECT 1 FROM public.trusted_media_bindings b WHERE b.media_id=m.id AND b.owner_id=auth.uid()))) $$;
REVOKE ALL ON FUNCTION public.security_private_media_read_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.security_private_media_read_allowed(text,text) TO authenticated;

CREATE POLICY "Authorized read private animal media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='animal-media' AND public.security_private_media_read_allowed(bucket_id,name));
-- No client INSERT/UPDATE/DELETE policies on animal-media: writes only through secure-upload, removal only through deletion cleanup.

CREATE TABLE public.photo_shares(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.photo_share_items(
 share_id uuid NOT NULL REFERENCES public.photo_shares(id) ON DELETE CASCADE,
 media_id uuid NOT NULL REFERENCES public.trusted_media(id),
 PRIMARY KEY(share_id,media_id));
GRANT ALL ON public.photo_shares TO service_role;
GRANT ALL ON public.photo_share_items TO service_role;
ALTER TABLE public.photo_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_share_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX photo_shares_owner_idx ON public.photo_shares(owner_id);

CREATE OR REPLACE FUNCTION public.create_photo_share(p_uid uuid, p_paths text[], p_hours integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ids uuid[]; secret text; s public.photo_shares%ROWTYPE; BEGIN
IF NOT public.security_account_active(p_uid) OR NOT public.security_feature_allowed(p_uid,'private_photos') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF p_paths IS NULL OR cardinality(p_paths) NOT BETWEEN 1 AND 20 OR p_hours IS NULL OR p_hours NOT BETWEEN 1 AND 720 THEN RETURN jsonb_build_object('error','invalid_share'); END IF;
SELECT array_agg(DISTINCT m.id) INTO ids FROM public.trusted_media m WHERE m.bucket='animal-media' AND m.object_path=ANY(p_paths) AND m.status='active' AND m.custodian_id=p_uid
 AND EXISTS(SELECT 1 FROM public.trusted_media_bindings b JOIN public.animals a ON a.id=b.entity_id WHERE b.media_id=m.id AND b.entity_kind='animal' AND a.user_id=p_uid);
IF ids IS NULL OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(p_paths) x) THEN RETURN jsonb_build_object('error','media_not_owned'); END IF;
secret:=encode(extensions.gen_random_bytes(32),'hex');
INSERT INTO public.photo_shares(owner_id,token_hash,expires_at) VALUES(p_uid,encode(extensions.digest(secret,'sha256'),'hex'),clock_timestamp()+make_interval(hours=>p_hours)) RETURNING * INTO s;
INSERT INTO public.photo_share_items(share_id,media_id) SELECT s.id,unnest(ids);
RETURN jsonb_build_object('id',s.id,'token',secret,'expires_at',s.expires_at,'count',cardinality(ids)); END $$;

CREATE OR REPLACE FUNCTION public.revoke_photo_share(p_uid uuid, p_share uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
UPDATE public.photo_shares SET revoked_at=clock_timestamp() WHERE id=p_share AND owner_id=p_uid AND revoked_at IS NULL; RETURN FOUND; END $$;

-- Valid only while unexpired, unrevoked, owner active and still custodian (a transfer ends the sender's shares).
CREATE OR REPLACE FUNCTION public.resolve_photo_share(p_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket',m.bucket,'path',m.object_path)),'[]'::jsonb)
FROM public.photo_shares s JOIN public.photo_share_items i ON i.share_id=s.id JOIN public.trusted_media m ON m.id=i.media_id
WHERE p_token ~ '^[0-9a-f]{64}$' AND s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
 AND public.security_account_active(s.owner_id) AND public.security_feature_allowed(s.owner_id,'private_photos') AND m.status='active' AND m.custodian_id=s.owner_id $$;

REVOKE ALL ON FUNCTION public.create_photo_share(uuid,text[],integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.revoke_photo_share(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.resolve_photo_share(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_photo_share(uuid,text[],integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_photo_share(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_photo_share(text) TO service_role;