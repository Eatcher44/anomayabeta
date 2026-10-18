CREATE FUNCTION public.security_feature_allowed(p_uid uuid,p_feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT EXISTS(SELECT 1 FROM public.security_release_state WHERE id AND (p_uid=ANY(test_users) OR CASE p_feature WHEN 'transfer' THEN transfers_enabled WHEN 'deletion' THEN deletion_enabled ELSE false END)) $$;
REVOKE ALL ON FUNCTION public.security_feature_allowed(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.consume_transfer_attempt(p_uid uuid,p_action text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w public.transfer_attempt_windows%ROWTYPE; duration interval; lim integer; BEGIN
IF p_action NOT IN ('create','claim') THEN RETURN false; END IF;
duration:=CASE p_action WHEN 'create' THEN interval '1 hour' ELSE interval '15 minutes' END; lim:=CASE p_action WHEN 'create' THEN 10 ELSE 20 END;
INSERT INTO public.transfer_attempt_windows(user_id,action,window_start,attempts) VALUES(p_uid,p_action,clock_timestamp(),0) ON CONFLICT DO NOTHING;
SELECT * INTO w FROM public.transfer_attempt_windows WHERE user_id=p_uid AND action=p_action FOR UPDATE;
IF w.window_start+duration<=clock_timestamp() THEN w.attempts:=0; w.window_start:=clock_timestamp(); END IF;
IF w.attempts>=lim THEN RETURN false; END IF;
UPDATE public.transfer_attempt_windows SET attempts=w.attempts+1,window_start=w.window_start WHERE user_id=p_uid AND action=p_action;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.consume_transfer_attempt(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.secure_create_transfer(p_uid uuid,p_animal uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.animals%ROWTYPE; secret text; tc public.transfer_codes%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF NOT public.consume_transfer_attempt(p_uid,'create') THEN RETURN jsonb_build_object('error','rate_limited'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal FOR UPDATE;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
secret:=upper(encode(extensions.gen_random_bytes(16),'hex'));
INSERT INTO public.transfer_codes(code,secret_hash,animal_id,from_user_id,expires_at) VALUES('SECURE',encode(extensions.digest(secret,'sha256'),'hex'),a.id,p_uid,clock_timestamp()+interval '7 days') RETURNING * INTO tc;
RETURN jsonb_build_object('id',tc.id,'code',secret,'animal_id',a.id,'expires_at',tc.expires_at,'claimed_at',NULL);
END $$;
REVOKE ALL ON FUNCTION public.secure_create_transfer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.secure_create_transfer(uuid,uuid) TO service_role;
CREATE FUNCTION public.secure_claim_transfer(p_uid uuid,p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tc public.transfer_codes%ROWTYPE; a public.animals%ROWTYPE; normalized text; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
IF NOT public.consume_transfer_attempt(p_uid,'claim') THEN RETURN jsonb_build_object('error','rate_limited'); END IF;
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
END $$;
REVOKE ALL ON FUNCTION public.secure_claim_transfer(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.secure_claim_transfer(uuid,text) TO service_role;
CREATE FUNCTION public.secure_list_transfers(p_uid uuid,p_animal uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'code','Code confidentiel','animal_id',t.animal_id,'expires_at',t.expires_at,'claimed_at',t.claimed_at) ORDER BY t.created_at DESC),'[]'::jsonb) FROM public.transfer_codes t WHERE t.from_user_id=p_uid AND t.animal_id=p_animal AND EXISTS(SELECT 1 FROM public.animals a WHERE a.id=p_animal AND a.user_id=p_uid) $$;
REVOKE ALL ON FUNCTION public.secure_list_transfers(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.secure_list_transfers(uuid,uuid) TO service_role;
CREATE FUNCTION public.prepare_secure_account_deletion(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE phase_now text; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
SELECT phase INTO phase_now FROM public.account_deletion_state WHERE user_id=p_uid;
IF phase_now='complete' THEN RETURN jsonb_build_object('complete',true,'files','[]'::jsonb); END IF;
IF phase_now IS DISTINCT FROM 'prepared' THEN
IF EXISTS(SELECT 1 FROM public.litters l JOIN public.animals a ON a.id=l.mother_id WHERE a.user_id=p_uid AND l.user_id<>p_uid) OR EXISTS(SELECT 1 FROM public.reproductions r JOIN public.animals a ON a.id=r.animal_id WHERE a.user_id=p_uid AND r.user_id<>p_uid) OR EXISTS(SELECT 1 FROM public.heat_cycles h JOIN public.animals a ON a.id=h.animal_id WHERE a.user_id=p_uid AND h.user_id<>p_uid) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
INSERT INTO public.account_deletion_state(user_id,phase,started_at) VALUES(p_uid,'prepared',clock_timestamp()) ON CONFLICT(user_id) DO UPDATE SET phase='prepared',started_at=COALESCE(public.account_deletion_state.started_at,EXCLUDED.started_at);
PERFORM set_config('anomaya.deletion_worker','on',true);
DELETE FROM public.transfer_archive WHERE original_owner_id=p_uid;
DELETE FROM public.transfer_codes WHERE from_user_id=p_uid OR to_user_id=p_uid;
DELETE FROM public.notifications WHERE user_id=p_uid;
DELETE FROM public.heat_cycles WHERE user_id=p_uid;
DELETE FROM public.litters WHERE user_id=p_uid;
DELETE FROM public.reproductions WHERE user_id=p_uid;
DELETE FROM public.animals WHERE user_id=p_uid;
DELETE FROM public.rendezvous WHERE user_id=p_uid;
DELETE FROM public.pharmacy_items WHERE user_id=p_uid;
DELETE FROM public.breeder_profiles WHERE user_id=p_uid;
DELETE FROM public.feedback WHERE user_id=p_uid;
DELETE FROM public.transfer_attempt_windows WHERE user_id=p_uid;
UPDATE public.trusted_media SET custodian_id=(SELECT owner_id FROM public.trusted_media_bindings b WHERE b.media_id=public.trusted_media.id ORDER BY entity_kind,entity_id LIMIT 1) WHERE custodian_id=p_uid AND EXISTS(SELECT 1 FROM public.trusted_media_bindings b WHERE b.media_id=public.trusted_media.id);
INSERT INTO public.media_cleanup_jobs(media_id,user_id,bucket,object_path) SELECT m.id,p_uid,m.bucket,m.object_path FROM public.trusted_media m WHERE m.custodian_id=p_uid AND m.status='active' AND NOT EXISTS(SELECT 1 FROM public.trusted_media_bindings b WHERE b.media_id=m.id) ON CONFLICT DO NOTHING;
UPDATE public.trusted_media SET status='deleting' WHERE id IN(SELECT media_id FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed);
PERFORM set_config('anomaya.deletion_worker','off',true);
END IF;
RETURN jsonb_build_object('files',COALESCE((SELECT jsonb_agg(jsonb_build_object('media_id',media_id,'bucket',bucket,'path',object_path)) FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.prepare_secure_account_deletion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_secure_account_deletion(uuid) TO service_role;
CREATE FUNCTION public.complete_media_cleanup(p_uid uuid,p_media uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT EXISTS(SELECT 1 FROM public.media_cleanup_jobs WHERE user_id=p_uid AND media_id=p_media) OR EXISTS(SELECT 1 FROM public.trusted_media_bindings WHERE media_id=p_media) THEN RAISE EXCEPTION 'cleanup_not_authorized'; END IF;
UPDATE public.media_cleanup_jobs SET completed=true WHERE user_id=p_uid AND media_id=p_media;
UPDATE public.trusted_media SET status='deleted' WHERE id=p_media;
END $$;
REVOKE ALL ON FUNCTION public.complete_media_cleanup(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_media_cleanup(uuid,uuid) TO service_role;
CREATE FUNCTION public.finalize_secure_account_deletion(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT EXISTS(SELECT 1 FROM public.account_deletion_state WHERE user_id=p_uid AND phase='prepared') OR EXISTS(SELECT 1 FROM public.media_cleanup_jobs WHERE user_id=p_uid AND NOT completed) THEN RAISE EXCEPTION 'cleanup_incomplete'; END IF;
UPDATE public.account_deletion_state SET phase='complete' WHERE user_id=p_uid;
END $$;
REVOKE ALL ON FUNCTION public.finalize_secure_account_deletion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_secure_account_deletion(uuid) TO service_role;