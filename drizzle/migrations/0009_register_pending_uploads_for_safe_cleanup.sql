CREATE FUNCTION public.prepare_account_cleanup(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url)
SELECT o.bucket_id,o.name,p_uid,'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||o.bucket_id||'/'||o.name
FROM storage.objects o WHERE o.bucket_id IN('animal-photos','bug-screenshots') AND o.owner_id=p_uid::text AND split_part(o.name,'/',1)=p_uid::text
ON CONFLICT(bucket,object_path) DO NOTHING;
RETURN public.prepare_secure_account_deletion(p_uid);
END $$;
REVOKE ALL ON FUNCTION public.prepare_account_cleanup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_cleanup(uuid) TO service_role;
CREATE FUNCTION public.transfer_link_safety_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
IF OLD.user_id IS DISTINCT FROM NEW.user_id AND (EXISTS(SELECT 1 FROM public.litters WHERE mother_id=OLD.id) OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=OLD.id) OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=OLD.id)) THEN RAISE EXCEPTION 'linked_records_require_support'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.transfer_link_safety_check() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER security_transfer_link_safety BEFORE UPDATE OF user_id ON public.animals FOR EACH ROW EXECUTE FUNCTION public.transfer_link_safety_check();