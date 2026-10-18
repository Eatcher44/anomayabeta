CREATE OR REPLACE FUNCTION public.transfer_has_complex_relationships(p_animal uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT EXISTS(SELECT 1 FROM public.animals WHERE id=p_animal AND (mother_id IS NOT NULL OR litter_id IS NOT NULL))
OR EXISTS(SELECT 1 FROM public.animals WHERE mother_id=p_animal)
OR EXISTS(SELECT 1 FROM public.litters WHERE mother_id=p_animal OR father_id=p_animal)
OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=p_animal OR father_animal_id=p_animal)
OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=p_animal)
OR EXISTS(SELECT 1 FROM public.rendezvous WHERE p_animal=ANY(COALESCE(animal_ids,'{}'::uuid[])))
$$;
REVOKE ALL ON FUNCTION public.transfer_has_complex_relationships(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_has_complex_relationships(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.transfer_link_safety_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF OLD.user_id IS DISTINCT FROM NEW.user_id AND public.transfer_has_complex_relationships(OLD.id) THEN RAISE EXCEPTION 'linked_records_require_support'; END IF;
RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.guard_transfer_code_relationships() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF public.transfer_has_complex_relationships(NEW.animal_id) THEN RAISE EXCEPTION 'linked_records_require_support'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_transfer_code_relationships() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER security_transfer_code_relationships BEFORE INSERT ON public.transfer_codes FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_code_relationships();
CREATE OR REPLACE FUNCTION public.deletion_has_foreign_relationships(p_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT EXISTS(SELECT 1 FROM public.animals child JOIN public.animals parent ON child.mother_id=parent.id WHERE parent.user_id=p_uid AND child.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.animals a JOIN public.litters l ON a.litter_id=l.id WHERE l.user_id=p_uid AND a.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.litters l JOIN public.animals a ON a.id=l.mother_id OR a.id=l.father_id WHERE a.user_id=p_uid AND l.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.litters l JOIN public.reproductions r ON r.id=l.reproduction_id WHERE r.user_id=p_uid AND l.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.reproductions r JOIN public.animals a ON a.id=r.animal_id OR a.id=r.father_animal_id WHERE a.user_id=p_uid AND r.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.heat_cycles h JOIN public.animals a ON a.id=h.animal_id WHERE a.user_id=p_uid AND h.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.notifications n JOIN public.animals a ON a.id=n.animal_id WHERE a.user_id=p_uid AND n.user_id<>p_uid)
OR EXISTS(SELECT 1 FROM public.rendezvous r JOIN public.animals a ON a.id=ANY(COALESCE(r.animal_ids,'{}'::uuid[])) WHERE a.user_id=p_uid AND r.user_id<>p_uid)
$$;
REVOKE ALL ON FUNCTION public.deletion_has_foreign_relationships(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deletion_has_foreign_relationships(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.prepare_account_cleanup(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF public.deletion_has_foreign_relationships(p_uid) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url)
SELECT o.bucket_id,o.name,p_uid,'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/'||o.bucket_id||'/'||o.name
FROM storage.objects o WHERE o.bucket_id IN('animal-photos','bug-screenshots') AND o.owner_id=p_uid::text AND split_part(o.name,'/',1)=p_uid::text
ON CONFLICT(bucket,object_path) DO NOTHING;
result:=public.prepare_secure_account_deletion(p_uid);
IF result ? 'error' THEN RETURN result; END IF;
IF NOT COALESCE((result->>'complete')::boolean,false) THEN
INSERT INTO public.media_cleanup_jobs(media_id,user_id,bucket,object_path) SELECT m.id,p_uid,m.bucket,m.object_path FROM public.trusted_media m WHERE m.custodian_id=p_uid AND m.status='active' AND NOT EXISTS(SELECT 1 FROM public.trusted_media_bindings b WHERE b.media_id=m.id) ON CONFLICT DO NOTHING;
UPDATE public.trusted_media SET status='deleting' WHERE id IN(SELECT media_id FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed);
RETURN jsonb_build_object('files',COALESCE((SELECT jsonb_agg(jsonb_build_object('media_id',media_id,'bucket',bucket,'path',object_path)) FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed),'[]'::jsonb));
END IF;
RETURN result; END $$;