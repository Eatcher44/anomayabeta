CREATE TABLE public.security_release_state (id boolean PRIMARY KEY DEFAULT true CHECK (id), transfers_enabled boolean NOT NULL DEFAULT false, deletion_enabled boolean NOT NULL DEFAULT false, test_users uuid[] NOT NULL DEFAULT '{}');
GRANT ALL ON public.security_release_state TO service_role;
ALTER TABLE public.security_release_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.security_release_state(id) VALUES(true);
CREATE TABLE public.account_deletion_state (user_id uuid PRIMARY KEY, phase text NOT NULL DEFAULT 'active' CHECK (phase IN ('active','prepared','complete')), started_at timestamptz);
GRANT ALL ON public.account_deletion_state TO service_role;
ALTER TABLE public.account_deletion_state ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.trusted_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket text NOT NULL CHECK(bucket IN ('animal-photos','bug-screenshots')), object_path text NOT NULL, custodian_id uuid NOT NULL, canonical_url text NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','deleting','deleted')), UNIQUE(bucket,object_path));
GRANT ALL ON public.trusted_media TO service_role;
ALTER TABLE public.trusted_media ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.trusted_media_bindings (media_id uuid NOT NULL REFERENCES public.trusted_media(id), entity_kind text NOT NULL CHECK(entity_kind IN ('animal','breeder','archive')), entity_id uuid NOT NULL, owner_id uuid NOT NULL, PRIMARY KEY(media_id,entity_kind,entity_id));
GRANT ALL ON public.trusted_media_bindings TO service_role;
ALTER TABLE public.trusted_media_bindings ENABLE ROW LEVEL SECURITY;
CREATE INDEX trusted_media_bindings_owner_idx ON public.trusted_media_bindings(owner_id);
CREATE TABLE public.media_cleanup_jobs (media_id uuid PRIMARY KEY REFERENCES public.trusted_media(id), user_id uuid NOT NULL, bucket text NOT NULL, object_path text NOT NULL, completed boolean NOT NULL DEFAULT false);
GRANT ALL ON public.media_cleanup_jobs TO service_role;
ALTER TABLE public.media_cleanup_jobs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.transfer_attempt_windows (user_id uuid NOT NULL, action text NOT NULL CHECK(action IN ('create','claim')), window_start timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,action));
GRANT ALL ON public.transfer_attempt_windows TO service_role;
ALTER TABLE public.transfer_attempt_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ADD COLUMN gallery_photos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.transfer_codes ADD COLUMN secret_hash text;
CREATE UNIQUE INDEX transfer_codes_secret_hash_idx ON public.transfer_codes(secret_hash) WHERE secret_hash IS NOT NULL;
REVOKE INSERT,UPDATE,DELETE ON public.transfer_archive FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.transfer_codes FROM PUBLIC,anon,authenticated;
COMMENT ON COLUMN public.transfer_codes.code IS 'DEPRECATED for new transfers: stores a display marker only; secret_hash validates server-issued codes.';
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url)
SELECT o.bucket_id,o.name,o.owner_id::uuid,'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||o.bucket_id||'/'||o.name
FROM storage.objects o WHERE o.bucket_id IN ('animal-photos','bug-screenshots') AND o.owner_id=split_part(o.name,'/',1) AND o.owner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
INSERT INTO public.trusted_media_bindings(media_id,entity_kind,entity_id,owner_id)
SELECT m.id,'animal',a.id,a.user_id FROM public.animals a JOIN public.trusted_media m ON m.canonical_url=a.photo AND m.custodian_id=a.user_id;
CREATE FUNCTION public.security_mutation_lock() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN IF NOT pg_try_advisory_xact_lock(728401,1) THEN RAISE EXCEPTION 'security_operation_busy' USING ERRCODE='40001'; END IF; END $$;
REVOKE ALL ON FUNCTION public.security_mutation_lock() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.security_account_active(p_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT p_uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.account_deletion_state WHERE user_id=p_uid AND phase<>'active') $$;
REVOKE ALL ON FUNCTION public.security_account_active(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.security_account_active(uuid) TO authenticated,service_role;
CREATE FUNCTION public.guard_account_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid; other_u uuid; j jsonb; BEGIN
PERFORM public.security_mutation_lock();
j:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
u:=COALESCE((j->>'user_id')::uuid,(j->>'original_owner_id')::uuid);
IF NOT public.security_account_active(u) AND current_setting('anomaya.deletion_worker',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'account_deletion_in_progress'; END IF;
IF TG_OP='UPDATE' AND COALESCE(to_jsonb(OLD)->>'user_id',to_jsonb(OLD)->>'original_owner_id') IS DISTINCT FROM COALESCE(j->>'user_id',j->>'original_owner_id') AND current_setting('anomaya.transfer_worker',true) IS DISTINCT FROM 'on' THEN RAISE EXCEPTION 'ownership_change_forbidden'; END IF;
IF TG_OP<>'DELETE' THEN
IF TG_TABLE_NAME IN ('heat_cycles','reproductions','notifications') AND j->>'animal_id' IS NOT NULL THEN SELECT user_id INTO other_u FROM public.animals WHERE id=(j->>'animal_id')::uuid; IF other_u IS DISTINCT FROM u THEN RAISE EXCEPTION 'foreign_animal_reference'; END IF; END IF;
IF TG_TABLE_NAME IN ('animals','litters') AND j->>'mother_id' IS NOT NULL THEN SELECT user_id INTO other_u FROM public.animals WHERE id=(j->>'mother_id')::uuid; IF other_u IS DISTINCT FROM u THEN RAISE EXCEPTION 'foreign_mother_reference'; END IF; END IF;
END IF;
RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END; END $$;
REVOKE ALL ON FUNCTION public.guard_account_mutation() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['animals','breeder_profiles','feedback','heat_cycles','litters','notifications','pharmacy_items','rendezvous','reproductions','transfer_archive'] LOOP EXECUTE format('CREATE TRIGGER security_account_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_account_mutation()',t); END LOOP; END $$;
CREATE FUNCTION public.bind_trusted_media(p_url text,p_kind text,p_entity uuid,p_owner uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.trusted_media%ROWTYPE; path text; BEGIN
IF p_url IS NULL OR p_url='' THEN RETURN; END IF;
SELECT * INTO m FROM public.trusted_media WHERE canonical_url=p_url FOR UPDATE;
IF NOT FOUND THEN
IF p_url NOT LIKE 'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/animal-photos/%' THEN RAISE EXCEPTION 'untrusted_media_url'; END IF;
path:=substr(p_url,length('https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/animal-photos/')+1);
IF path LIKE '%?%' OR path LIKE '%#%' OR path LIKE '%..%' OR path LIKE '%\%%' OR split_part(path,'/',1)<>p_owner::text THEN RAISE EXCEPTION 'untrusted_media_path'; END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='animal-photos' AND o.name=path AND o.owner_id=p_owner::text) THEN RAISE EXCEPTION 'media_not_owned'; END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url) VALUES('animal-photos',path,p_owner,p_url) RETURNING * INTO m;
END IF;
IF m.status<>'active' THEN RAISE EXCEPTION 'media_unavailable'; END IF;
IF m.custodian_id<>p_owner AND NOT EXISTS(SELECT 1 FROM public.trusted_media_bindings WHERE media_id=m.id AND entity_kind=p_kind AND entity_id=p_entity AND owner_id=p_owner) THEN RAISE EXCEPTION 'media_not_owned'; END IF;
INSERT INTO public.trusted_media_bindings(media_id,entity_kind,entity_id,owner_id) VALUES(m.id,p_kind,p_entity,p_owner) ON CONFLICT(media_id,entity_kind,entity_id) DO UPDATE SET owner_id=EXCLUDED.owner_id;
END $$;
REVOKE ALL ON FUNCTION public.bind_trusted_media(text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.sync_trusted_media_bindings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE kind text; urls text[]; u uuid; entity uuid; photo_url text; BEGIN
kind:=CASE TG_TABLE_NAME WHEN 'animals' THEN 'animal' WHEN 'breeder_profiles' THEN 'breeder' ELSE 'archive' END;
IF TG_OP='DELETE' THEN DELETE FROM public.trusted_media_bindings WHERE entity_kind=kind AND entity_id=OLD.id; RETURN OLD; END IF;
u:=CASE WHEN kind='archive' THEN NEW.original_owner_id ELSE NEW.user_id END; entity:=NEW.id;
IF kind='animal' THEN
IF jsonb_typeof(NEW.gallery_photos)<>'array' OR jsonb_array_length(NEW.gallery_photos)>4 THEN RAISE EXCEPTION 'invalid_gallery'; END IF;
urls:=ARRAY[NEW.photo]||ARRAY(SELECT jsonb_array_elements_text(NEW.gallery_photos));
ELSIF kind='breeder' THEN urls:=ARRAY[NEW.logo_url,NEW.signature_url]; ELSE urls:=ARRAY[NEW.animal_photo]; END IF;
FOREACH photo_url IN ARRAY urls LOOP PERFORM public.bind_trusted_media(photo_url,kind,entity,u); END LOOP;
DELETE FROM public.trusted_media_bindings b USING public.trusted_media m WHERE b.media_id=m.id AND b.entity_kind=kind AND b.entity_id=entity AND NOT (m.canonical_url=ANY(array_remove(urls,NULL)));
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.sync_trusted_media_bindings() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER security_media_bindings AFTER INSERT OR UPDATE OR DELETE ON public.animals FOR EACH ROW EXECUTE FUNCTION public.sync_trusted_media_bindings();
CREATE TRIGGER security_media_bindings AFTER INSERT OR UPDATE OR DELETE ON public.breeder_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_trusted_media_bindings();
CREATE TRIGGER security_media_bindings AFTER INSERT OR UPDATE OR DELETE ON public.transfer_archive FOR EACH ROW EXECUTE FUNCTION public.sync_trusted_media_bindings();
CREATE FUNCTION public.security_upload_allowed(p_bucket text,p_path text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
RETURN auth.uid() IS NOT NULL AND public.security_account_active(auth.uid()) AND split_part(p_path,'/',1)=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.trusted_media WHERE bucket=p_bucket AND object_path=p_path);
END $$;
REVOKE ALL ON FUNCTION public.security_upload_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.security_upload_allowed(text,text) TO authenticated;
ALTER POLICY "Users can upload animal photos" ON storage.objects WITH CHECK(bucket_id='animal-photos' AND public.security_upload_allowed(bucket_id,name));
ALTER POLICY "Users can upload bug screenshots" ON storage.objects WITH CHECK(bucket_id='bug-screenshots' AND public.security_upload_allowed(bucket_id,name));