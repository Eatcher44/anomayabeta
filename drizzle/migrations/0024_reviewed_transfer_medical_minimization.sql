ALTER TABLE public.transfer_codes ADD COLUMN IF NOT EXISTS approved_hash text;
ALTER TABLE public.transfer_archive ADD COLUMN IF NOT EXISTS private_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.transfer_safe_date(v jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
SELECT CASE WHEN jsonb_typeof(v)='string' AND length(v#>>'{}')<=40 AND (v#>>'{}') ~ '^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?)?$' THEN v END $$;
CREATE OR REPLACE FUNCTION public.transfer_safe_num(v jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
SELECT CASE WHEN jsonb_typeof(v)='number' THEN v END $$;
CREATE OR REPLACE FUNCTION public.transfer_safe_id(v jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
SELECT CASE WHEN jsonb_typeof(v) IN ('string','number') AND (v#>>'{}') ~ '^[A-Za-z0-9_-]{1,64}$' THEN to_jsonb(v#>>'{}') END $$;
CREATE OR REPLACE FUNCTION public.transfer_safe_array(v jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $$
SELECT CASE WHEN jsonb_typeof(v)='array' THEN v ELSE '[]'::jsonb END $$;

-- Strict allowlist: only structured care data; every free-text or unknown field stays with the sender.
CREATE OR REPLACE FUNCTION public.transfer_shared_projection(a public.animals) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
SELECT jsonb_build_object(
 'soins',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
   'id',public.transfer_safe_id(e->'id'),
   'type',CASE WHEN e->>'type' IN ('Vaccin','Vermifuge','Antipuce','Traitement','Médicament') THEN e->'type' END,
   'date',public.transfer_safe_date(e->'date'),'prochain',public.transfer_safe_date(e->'prochain'),
   'debut',public.transfer_safe_date(e->'debut'),'fin',public.transfer_safe_date(e->'fin'),
   'rappelMois',public.transfer_safe_num(e->'rappelMois'),'dureeValide',public.transfer_safe_num(e->'dureeValide'),
   'doseValue',public.transfer_safe_num(e->'doseValue'),'dosesPerDay',public.transfer_safe_num(e->'dosesPerDay'),
   'doseUnit',CASE WHEN e->>'doseUnit' IN ('comprimé','ml') THEN e->'doseUnit' END,
   'obligatoire',CASE WHEN jsonb_typeof(e->'obligatoire')='boolean' THEN e->'obligatoire' END,
   'times',(SELECT jsonb_agg(t) FROM jsonb_array_elements(public.transfer_safe_array(e->'times')) t WHERE jsonb_typeof(t)='string' AND (t#>>'{}') ~ '^\d{2}:\d{2}$')
 ))) FROM jsonb_array_elements(public.transfer_safe_array(a.soins)) e WHERE jsonb_typeof(e)='object'),'[]'::jsonb),
 'consultations',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',public.transfer_safe_id(e->'id'),'date',public.transfer_safe_date(e->'date'))))
   FROM jsonb_array_elements(public.transfer_safe_array(a.consultations)) e WHERE jsonb_typeof(e)='object'),'[]'::jsonb),
 'poids',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',public.transfer_safe_id(e->'id'),'date',public.transfer_safe_date(e->'date'),'poids',public.transfer_safe_num(e->'poids'))))
   FROM jsonb_array_elements(public.transfer_safe_array(a.poids)) e WHERE jsonb_typeof(e)='object'),'[]'::jsonb),
 'repas',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',public.transfer_safe_id(e->'id'),'date',public.transfer_safe_date(e->'date'),
   'time',CASE WHEN jsonb_typeof(e->'time')='string' AND (e->>'time') ~ '^\d{2}:\d{2}$' THEN e->'time' END,'quantity',public.transfer_safe_num(e->'quantity'))))
   FROM jsonb_array_elements(public.transfer_safe_array(a.repas)) e WHERE jsonb_typeof(e)='object'),'[]'::jsonb)) $$;

-- Version of everything the review covers; any change requires a new review.
CREATE OR REPLACE FUNCTION public.transfer_review_hash(a public.animals) RETURNS text LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
SELECT encode(extensions.digest(jsonb_build_object('v',1,'id',a.id,'nom',a.nom,'type',a.type,'sexe',a.sexe,'race',a.race,'naissance',a.naissance,'sterilise',a.sterilise,'puce',a.puce,'couleur',a.couleur,'robe',a.robe,'particularite',a.particularite,
 'soins',a.soins,'consultations',a.consultations,'poids',a.poids,'repas',a.repas,'buyer_name',a.buyer_name,'buyer_phone',a.buyer_phone,'buyer_email',a.buyer_email,'commercial_notes',a.commercial_notes)::text,'sha256'),'hex') $$;

CREATE OR REPLACE FUNCTION public.transfer_review_summary(a public.animals) RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public','pg_temp' AS $$
WITH s AS (SELECT e FROM jsonb_array_elements(public.transfer_safe_array(a.soins)) e WHERE jsonb_typeof(e)='object'),
 c AS (SELECT e FROM jsonb_array_elements(public.transfer_safe_array(a.consultations)) e WHERE jsonb_typeof(e)='object'),
 p AS (SELECT public.transfer_shared_projection(a) j)
SELECT jsonb_build_object(
 'shared',jsonb_build_object('soins',jsonb_array_length(p.j->'soins'),'consultations',jsonb_array_length(p.j->'consultations'),'poids',jsonb_array_length(p.j->'poids'),'repas',jsonb_array_length(p.j->'repas')),
 'private',jsonb_build_object(
   'noms_soins',(SELECT count(*) FROM s WHERE COALESCE(btrim(e->>'nom'),'')<>''),
   'produits',(SELECT count(*) FROM s WHERE COALESCE(btrim(e->>'produit'),'')<>''),
   'veterinaires',(SELECT count(*) FROM s WHERE COALESCE(btrim(e->>'veterinaire'),'')<>'')+(SELECT count(*) FROM c WHERE COALESCE(btrim(e->>'veterinaire'),'')<>''),
   'motifs',(SELECT count(*) FROM c WHERE COALESCE(btrim(e->>'motif'),'')<>''),
   'particularite',COALESCE(btrim(a.particularite),'')<>'',
   'contact_acheteur',COALESCE(a.buyer_name,a.buyer_phone,a.buyer_email,'')<>'',
   'notes_commerciales',COALESCE(btrim(a.commercial_notes),'')<>''),
 'blocked',CASE WHEN public.transfer_has_private_notes(a.id) THEN 'private_notes_require_support' WHEN public.transfer_has_complex_relationships(a.id) THEN 'linked_records_require_support' END)
FROM p $$;

CREATE OR REPLACE FUNCTION public.secure_preview_transfer(p_uid uuid, p_animal uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE a public.animals%ROWTYPE; BEGIN
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
RETURN public.transfer_review_summary(a)||jsonb_build_object('approval',public.transfer_review_hash(a)); END $$;

CREATE OR REPLACE FUNCTION public.secure_create_transfer_reviewed(p_uid uuid, p_animal uuid, p_approval text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE a public.animals%ROWTYPE; secret text; tc public.transfer_codes%ROWTYPE; BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'transfer') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF NOT public.security_account_active(p_uid) THEN RETURN jsonb_build_object('error','account_deletion_in_progress'); END IF;
SELECT * INTO a FROM public.animals WHERE id=p_animal FOR UPDATE;
IF NOT FOUND OR a.user_id<>p_uid THEN RETURN jsonb_build_object('error','animal_not_owned'); END IF;
IF p_approval IS NULL OR p_approval<>public.transfer_review_hash(a) THEN RETURN jsonb_build_object('error','review_required'); END IF;
IF EXISTS(SELECT 1 FROM public.litters WHERE mother_id=a.id) OR EXISTS(SELECT 1 FROM public.reproductions WHERE animal_id=a.id) OR EXISTS(SELECT 1 FROM public.heat_cycles WHERE animal_id=a.id) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
secret:=upper(encode(extensions.gen_random_bytes(16),'hex'));
INSERT INTO public.transfer_codes(code,secret_hash,animal_id,from_user_id,expires_at,approved_hash) VALUES('SECURE-'||gen_random_uuid()::text,encode(extensions.digest(secret,'sha256'),'hex'),a.id,p_uid,clock_timestamp()+interval '7 days',p_approval) RETURNING * INTO tc;
RETURN jsonb_build_object('id',tc.id,'code',secret,'animal_id',a.id,'expires_at',tc.expires_at,'claimed_at',NULL); END $$;

CREATE OR REPLACE FUNCTION public.secure_claim_transfer_reviewed(p_uid uuid, p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE tc public.transfer_codes%ROWTYPE; a public.animals%ROWTYPE; normalized text; shared jsonb; BEGIN
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
shared:=public.transfer_shared_projection(a);
PERFORM set_config('anomaya.transfer_worker','on',true);
-- Sender keeps the full original dossier in their own protected archive.
INSERT INTO public.transfer_archive(original_owner_id,animal_id,animal_name,animal_photo,animal_data,transfer_code_id,private_snapshot) VALUES(a.user_id,a.id,a.nom,a.photo,jsonb_build_object('type',a.type,'sexe',a.sexe,'race',a.race,'naissance',a.naissance,'puce',a.puce,'poids',a.poids,'soins',a.soins,'consultations',a.consultations),tc.id,
 jsonb_build_object('repas',a.repas,'particularite',a.particularite,'buyer_name',a.buyer_name,'buyer_phone',a.buyer_phone,'buyer_email',a.buyer_email,'commercial_notes',a.commercial_notes));
UPDATE public.trusted_media SET custodian_id=p_uid WHERE id IN(SELECT media_id FROM public.trusted_media_bindings WHERE entity_kind='animal' AND entity_id=a.id);
UPDATE public.trusted_media_bindings SET owner_id=p_uid WHERE entity_kind='animal' AND entity_id=a.id;
UPDATE public.animals SET user_id=p_uid,litter_id=NULL,mother_id=NULL,breeder_visible=true,buyer_name=NULL,buyer_phone=NULL,buyer_email=NULL,commercial_notes=NULL,deposit_received=false,planned_departure_date=NULL,
 particularite=NULL,soins=shared->'soins',consultations=shared->'consultations',poids=shared->'poids',repas=shared->'repas' WHERE id=a.id;
UPDATE public.transfer_codes SET to_user_id=p_uid,claimed_at=clock_timestamp() WHERE id=tc.id;
UPDATE public.transfer_codes SET expires_at=clock_timestamp() WHERE animal_id=a.id AND claimed_at IS NULL AND id<>tc.id;
DELETE FROM public.notifications WHERE animal_id=a.id AND user_id=tc.from_user_id;
PERFORM set_config('anomaya.transfer_worker','off',true);
RETURN jsonb_build_object('animal_id',a.id); END $$;

REVOKE ALL ON FUNCTION public.transfer_safe_date(jsonb), public.transfer_safe_num(jsonb), public.transfer_safe_id(jsonb), public.transfer_safe_array(jsonb), public.transfer_shared_projection(public.animals), public.transfer_review_hash(public.animals), public.transfer_review_summary(public.animals), public.secure_preview_transfer(uuid,uuid), public.secure_create_transfer_reviewed(uuid,uuid,text), public.secure_claim_transfer_reviewed(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.secure_preview_transfer(uuid,uuid), public.secure_create_transfer_reviewed(uuid,uuid,text), public.secure_claim_transfer_reviewed(uuid,text) TO service_role;
COMMENT ON FUNCTION public.secure_create_transfer_checked(uuid,uuid) IS 'DEPRECATED: replaced by secure_create_transfer_reviewed';
COMMENT ON FUNCTION public.secure_claim_transfer_checked(uuid,text) IS 'DEPRECATED: replaced by secure_claim_transfer_reviewed';