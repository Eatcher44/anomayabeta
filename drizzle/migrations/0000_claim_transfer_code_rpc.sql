CREATE OR REPLACE FUNCTION public.claim_transfer_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tc public.transfer_codes%ROWTYPE;
  v_animal public.animals%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_tc FROM public.transfer_codes
   WHERE code = upper(trim(p_code))
   FOR UPDATE;

  IF NOT FOUND OR v_tc.claimed_at IS NOT NULL OR v_tc.expires_at <= now() THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001';
  END IF;
  IF v_tc.from_user_id = v_uid THEN
    RAISE EXCEPTION 'own_code' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_animal FROM public.animals WHERE id = v_tc.animal_id FOR UPDATE;
  IF NOT FOUND OR v_animal.user_id <> v_tc.from_user_id THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.transfer_archive (original_owner_id, animal_id, animal_name, animal_photo, animal_data, transfer_code_id)
  VALUES (v_tc.from_user_id, v_animal.id, v_animal.nom, v_animal.photo,
    jsonb_build_object('type', v_animal.type, 'sexe', v_animal.sexe, 'race', v_animal.race,
      'naissance', v_animal.naissance, 'puce', v_animal.puce, 'poids', v_animal.poids,
      'soins', v_animal.soins, 'consultations', v_animal.consultations),
    v_tc.id);

  UPDATE public.animals
     SET user_id = v_uid, litter_id = NULL, mother_id = NULL, breeder_visible = true
   WHERE id = v_animal.id;

  UPDATE public.transfer_codes SET to_user_id = v_uid, claimed_at = now() WHERE id = v_tc.id;

  -- Invalidate any other open codes for this animal.
  UPDATE public.transfer_codes SET expires_at = now()
   WHERE animal_id = v_animal.id AND claimed_at IS NULL AND id <> v_tc.id;

  DELETE FROM public.notifications WHERE animal_id = v_animal.id AND user_id = v_tc.from_user_id;

  RETURN v_animal.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_transfer_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_transfer_code(text) TO authenticated;