REVOKE ALL ON public.transfer_attempt_windows FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.secure_create_transfer_checked(p_uid uuid, p_animal uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE a public.animals%ROWTYPE; secret text; tc public.transfer_codes%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal FOR UPDATE;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
IF EXISTS(SELECT 1 FROM public.litters WHERE mother_id=a.id) OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=a.id) OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=a.id) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
secret:=upper(encode(extensions.gen_random_bytes(16),'hex'));
INSERT INTO public.transfer_codes(code,secret_hash,animal_id,from_user_id,expires_at) VALUES('SECURE-'||gen_random_uuid()::text,encode(extensions.digest(secret,'sha256'),'hex'),a.id,p_uid,clock_timestamp()+interval '7 days') RETURNING * INTO tc;
RETURN jsonb_build_object('id',tc.id,'code',secret,'animal_id',a.id,'expires_at',tc.expires_at,'claimed_at',NULL);
END $function$;

CREATE OR REPLACE FUNCTION public.secure_claim_transfer_checked(p_uid uuid, p_code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE tc public.transfer_codes%ROWTYPE; a public.animals%ROWTYPE; normalized text; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
normalized:=upper(trim(p_code));
IF normalized IS NULL OR normalized !~ '^[0-9A-F]{32}$' THEN RETURN jsonb_build_object('error','invalid_code'); END IF;
SELECT * INTO tc FROM public.transfer_codes WHERE secret_hash=encode(extensions.digest(normalized,'sha256'),'hex') FOR UPDATE;
IF NOT FOUND OR tc.claimed_at IS NOT NULL OR tc.expires_at<=clock_timestamp() THEN RETURN jsonb_build_object('error','invalid_code'); END IF;
IF tc.from_user_id=p_uid THEN RETURN jsonb_build_object('error','own_code'); END IF;
IF NOT public.security_account_active(tc.from_user_id) THEN RETURN jsonb_build_object('error','invalid_code'); END IF;
SELECT * INTO a FROM public.animals WHERE id=tc.animal_id FOR UPDATE;
IF NOT FOUND OR a.user_id<>tc.from_user_id THEN RETURN jsonb_build_object('error','invalid_code'); END IF;
PERFORM set_config('anomaya.transfer_worker','on',true);
INSERT INTO public.transfer_archive(original_owner_id,animal_id,animal_name,animal_photo,animal_data,transfer_code_id) VALUES(a.user_id,a.id,a.nom,a.photo,jsonb_build_object('type',a.type,'sexe',a.sexe,'race',a.race,'naissance',a.naissance,'puce',a.puce,'poids',a.poids,'soins',a.soins,'consultations',a.consultations),tc.id);
UPDATE public.trusted_media SET custodian_id=p_uid WHERE id IN(SELECT media_id FROM public.trusted_media_bindings WHERE entity_kind='animal' AND entity_id=a.id);
UPDATE public.trusted_media_bindings SET owner_id=p_uid WHERE entity_kind='animal' AND entity_id=a.id;
UPDATE public.animals SET user_id=p_uid,litter_id=NULL,mother_id=NULL,breeder_visible=true,buyer_name=NULL,buyer_phone=NULL,buyer_email=NULL,commercial_notes=NULL,deposit_received=false,planned_departure_date=NULL WHERE id=a.id;
UPDATE public.transfer_codes SET to_user_id=p_uid,claimed_at=clock_timestamp() WHERE id=tc.id;
UPDATE public.transfer_codes SET expires_at=clock_timestamp() WHERE animal_id=a.id AND claimed_at IS NULL AND id<>tc.id;
DELETE FROM public.notifications WHERE animal_id=a.id AND user_id=tc.from_user_id;
PERFORM set_config('anomaya.transfer_worker','off',true);
RETURN jsonb_build_object('animal_id',a.id);
END $function$;

REVOKE ALL ON FUNCTION public.secure_create_transfer_checked(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_claim_transfer_checked(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secure_create_transfer_checked(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_claim_transfer_checked(uuid,text) TO service_role;