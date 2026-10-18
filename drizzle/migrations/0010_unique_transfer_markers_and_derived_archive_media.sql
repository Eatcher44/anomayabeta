CREATE OR REPLACE FUNCTION public.secure_create_transfer(p_uid uuid,p_animal uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.animals%ROWTYPE; secret text; tc public.transfer_codes%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF NOT public.consume_transfer_attempt(p_uid,'create') THEN RETURN jsonb_build_object('error','rate_limited'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal FOR UPDATE;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
IF EXISTS(SELECT 1 FROM public.litters WHERE mother_id=a.id) OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=a.id) OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=a.id) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
secret:=upper(encode(extensions.gen_random_bytes(16),'hex'));
INSERT INTO public.transfer_codes(code,secret_hash,animal_id,from_user_id,expires_at) VALUES('SECURE-'||gen_random_uuid()::text,encode(extensions.digest(secret,'sha256'),'hex'),a.id,p_uid,clock_timestamp()+interval '7 days') RETURNING * INTO tc;
RETURN jsonb_build_object('id',tc.id,'code',secret,'animal_id',a.id,'expires_at',tc.expires_at,'claimed_at',NULL);
END $$;
CREATE OR REPLACE FUNCTION public.bind_trusted_media(p_url text,p_kind text,p_entity uuid,p_owner uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.trusted_media%ROWTYPE; path text; BEGIN
IF p_url IS NULL OR p_url='' THEN RETURN; END IF;
SELECT * INTO m FROM public.trusted_media WHERE canonical_url=p_url FOR UPDATE;
IF NOT FOUND THEN
IF p_url NOT LIKE 'https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/animal-photos/%' THEN RAISE EXCEPTION 'untrusted_media_url'; END IF;
path:=substr(p_url,length('https://rgqqrphcezawqchepgij.supabase.co/storage/v1/object/public/animal-photos/')+1);
IF path LIKE '%?%' OR path LIKE '%#%' OR path LIKE '%..%' OR position('%' IN path)>0 OR split_part(path,'/',1)<>p_owner::text THEN RAISE EXCEPTION 'untrusted_media_path'; END IF;
IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='animal-photos' AND o.name=path AND o.owner_id=p_owner::text) THEN RAISE EXCEPTION 'media_not_owned'; END IF;
INSERT INTO public.trusted_media(bucket,object_path,custodian_id,canonical_url) VALUES('animal-photos',path,p_owner,p_url) RETURNING * INTO m;
END IF;
IF m.status<>'active' THEN RAISE EXCEPTION 'media_unavailable'; END IF;
IF m.custodian_id<>p_owner AND NOT EXISTS(SELECT 1 FROM public.trusted_media_bindings WHERE media_id=m.id AND entity_kind=p_kind AND entity_id=p_entity AND owner_id=p_owner) AND NOT (p_kind='archive' AND current_setting('anomaya.transfer_worker',true)='on' AND EXISTS(SELECT 1 FROM public.transfer_archive ar JOIN public.trusted_media_bindings b ON b.entity_kind='animal' AND b.entity_id=ar.animal_id AND b.media_id=m.id AND b.owner_id=p_owner WHERE ar.id=p_entity AND ar.original_owner_id=p_owner)) THEN RAISE EXCEPTION 'media_not_owned'; END IF;
INSERT INTO public.trusted_media_bindings(media_id,entity_kind,entity_id,owner_id) VALUES(m.id,p_kind,p_entity,p_owner) ON CONFLICT(media_id,entity_kind,entity_id) DO UPDATE SET owner_id=EXCLUDED.owner_id;
END $$;