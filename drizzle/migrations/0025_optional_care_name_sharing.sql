ALTER TABLE public.transfer_codes ADD COLUMN IF NOT EXISTS shared_selection jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Sender-only list of care entries whose free-text name/product may be shared on explicit selection.
CREATE OR REPLACE FUNCTION public.transfer_named_items(a public.animals) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',public.transfer_safe_id(e->'id'),'type',e->'type','date',COALESCE(public.transfer_safe_date(e->'date'),public.transfer_safe_date(e->'debut')),
 'nom',CASE WHEN jsonb_typeof(e->'nom')='string' AND btrim(e->>'nom')<>'' THEN to_jsonb(left(e->>'nom',200)) END,
 'produit',CASE WHEN jsonb_typeof(e->'produit')='string' AND btrim(e->>'produit')<>'' THEN to_jsonb(left(e->>'produit',200)) END))),'[]'::jsonb)
FROM jsonb_array_elements(public.transfer_safe_array(a.soins)) e
WHERE jsonb_typeof(e)='object' AND public.transfer_safe_id(e->'id') IS NOT NULL
 AND ((jsonb_typeof(e->'nom')='string' AND btrim(e->>'nom')<>'') OR (jsonb_typeof(e->'produit')='string' AND btrim(e->>'produit')<>'')) $$;

-- Validates and canonicalizes a selection against the current dossier; NULL means forged or stale.
CREATE OR REPLACE FUNCTION public.transfer_validate_selection(a public.animals, p_sel jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public','pg_temp' AS $$
DECLARE named jsonb:=public.transfer_named_items(a); x jsonb; BEGIN
IF p_sel IS NULL THEN RETURN '[]'::jsonb; END IF;
IF jsonb_typeof(p_sel)<>'array' OR jsonb_array_length(p_sel)>200 THEN RETURN NULL; END IF;
FOR x IN SELECT * FROM jsonb_array_elements(p_sel) LOOP
 IF jsonb_typeof(x)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(x))<>2 OR NOT (x ? 'id' AND x ? 'field') OR jsonb_typeof(x->'id')<>'string' OR x->>'field' NOT IN ('nom','produit') THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(named) n WHERE n->>'id'=x->>'id' AND n ? (x->>'field')) THEN RETURN NULL; END IF;
END LOOP;
RETURN COALESCE((SELECT jsonb_agg(v ORDER BY v->>'id',v->>'field') FROM (SELECT DISTINCT jsonb_build_object('id',x->>'id','field',x->>'field') v FROM jsonb_array_elements(p_sel) x) d),'[]'::jsonb); END $$;

CREATE OR REPLACE FUNCTION public.transfer_apply_selection(a public.animals, p_soins jsonb, p_sel jsonb) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
SELECT COALESCE(jsonb_agg(p.e || jsonb_strip_nulls(jsonb_build_object(
 'nom',CASE WHEN p_sel @> jsonb_build_array(jsonb_build_object('id',p.e->>'id','field','nom')) THEN (SELECT n->'nom' FROM jsonb_array_elements(public.transfer_named_items(a)) n WHERE n->>'id'=p.e->>'id' LIMIT 1) END,
 'produit',CASE WHEN p_sel @> jsonb_build_array(jsonb_build_object('id',p.e->>'id','field','produit')) THEN (SELECT n->'produit' FROM jsonb_array_elements(public.transfer_named_items(a)) n WHERE n->>'id'=p.e->>'id' LIMIT 1) END)) ORDER BY p.o),'[]'::jsonb)
FROM jsonb_array_elements(p_soins) WITH ORDINALITY p(e,o) $$;

CREATE OR REPLACE FUNCTION public.secure_preview_transfer(p_uid uuid, p_animal uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE a public.animals%ROWTYPE; BEGIN
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
RETURN public.transfer_review_summary(a)||jsonb_build_object('approval',public.transfer_review_hash(a),'named',public.transfer_named_items(a)); END $$;

CREATE OR REPLACE FUNCTION public.secure_create_transfer_selected(p_uid uuid, p_animal uuid, p_approval text, p_selection jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE a public.animals%ROWTYPE; secret text; tc public.transfer_codes%ROWTYPE; sel jsonb; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal FOR UPDATE;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
IF p_approval IS NULL OR p_approval<>public.transfer_review_hash(a) THEN RETURN jsonb_build_object('error','review_required'); END IF;
sel:=public.transfer_validate_selection(a,p_selection);
IF sel IS NULL THEN RETURN jsonb_build_object('error','invalid_selection'); END IF;
IF EXISTS(SELECT 1 FROM public.litters WHERE mother_id=a.id) OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=a.id) OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=a.id) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
secret:=upper(encode(extensions.gen_random_bytes(16),'hex'));
INSERT INTO public.transfer_codes(code,secret_hash,animal_id,from_user_id,expires_at,approved_hash,shared_selection) VALUES('SECURE-'||gen_random_uuid()::text,encode(extensions.digest(secret,'sha256'),'hex'),a.id,p_uid,clock_timestamp()+interval '7 days',p_approval,sel) RETURNING * INTO tc;
RETURN jsonb_build_object('id',tc.id,'code',secret,'animal_id',a.id,'expires_at',tc.expires_at,'claimed_at',NULL,'shared',sel); END $$;

CREATE OR REPLACE FUNCTION public.secure_claim_transfer_reviewed(p_uid uuid, p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE tc public.transfer_codes%ROWTYPE; a public.animals%ROWTYPE; normalized text; shared jsonb; sel jsonb; BEGIN
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
IF tc.approved_hash IS NULL OR tc.approved_hash<>public.transfer_review_hash(a) THEN RETURN jsonb_build_object('error','review_required'); END IF;
sel:=public.transfer_validate_selection(a,tc.shared_selection);
IF sel IS NULL THEN RETURN jsonb_build_object('error','review_required'); END IF;
shared:=public.transfer_shared_projection(a);
shared:=jsonb_set(shared,'{soins}',public.transfer_apply_selection(a,shared->'soins',sel));
PERFORM set_config('anomaya.transfer_worker','on',true);
INSERT INTO public.transfer_archive(original_owner_id,animal_id,animal_name,animal_photo,animal_data,transfer_code_id,private_snapshot) VALUES(a.user_id,a.id,a.nom,a.photo,jsonb_build_object('type',a.type,'sexe',a.sexe,'race',a.race,'naissance',a.naissance,'puce',a.puce,'poids',a.poids,'soins',a.soins,'consultations',a.consultations),tc.id,
 jsonb_build_object('repas',a.repas,'particularite',a.particularite,'buyer_name',a.buyer_name,'buyer_phone',a.buyer_phone,'buyer_email',a.buyer_email,'commercial_notes',a.commercial_notes,'shared_selection',sel));
UPDATE public.trusted_media SET custodian_id=p_uid WHERE id IN(SELECT media_id FROM public.trusted_media_bindings WHERE entity_kind='animal' AND entity_id=a.id);
UPDATE public.trusted_media_bindings SET owner_id=p_uid WHERE entity_kind='animal' AND entity_id=a.id;
UPDATE public.animals SET user_id=p_uid,litter_id=NULL,mother_id=NULL,breeder_visible=true,buyer_name=NULL,buyer_phone=NULL,buyer_email=NULL,commercial_notes=NULL,deposit_received=false,planned_departure_date=NULL,
 particularite=NULL,soins=shared->'soins',consultations=shared->'consultations',poids=shared->'poids',repas=shared->'repas' WHERE id=a.id;
UPDATE public.transfer_codes SET to_user_id=p_uid,claimed_at=clock_timestamp() WHERE id=tc.id;
UPDATE public.transfer_codes SET expires_at=clock_timestamp() WHERE animal_id=a.id AND claimed_at IS NULL AND id<>tc.id;
DELETE FROM public.notifications WHERE animal_id=a.id AND user_id=tc.from_user_id;
PERFORM set_config('anomaya.transfer_worker','off',true);
RETURN jsonb_build_object('animal_id',a.id); END $$;

REVOKE ALL ON FUNCTION public.transfer_named_items(public.animals), public.transfer_validate_selection(public.animals,jsonb), public.transfer_apply_selection(public.animals,jsonb,jsonb), public.secure_create_transfer_selected(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secure_create_transfer_selected(uuid,uuid,text,jsonb) TO service_role;
COMMENT ON FUNCTION public.secure_create_transfer_reviewed(uuid,uuid,text) IS 'DEPRECATED: replaced by secure_create_transfer_selected';