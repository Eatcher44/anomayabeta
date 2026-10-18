CREATE FUNCTION public.transfer_has_private_notes(p_animal uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
SELECT EXISTS(SELECT 1 FROM public.animals a CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.soins)='array' THEN a.soins ELSE '[]'::jsonb END || CASE WHEN jsonb_typeof(a.consultations)='array' THEN a.consultations ELSE '[]'::jsonb END || CASE WHEN jsonb_typeof(a.repas)='array' THEN a.repas ELSE '[]'::jsonb END) entry WHERE a.id=p_animal AND (btrim(COALESCE(entry->>'notes',''))<>'' OR btrim(COALESCE(entry->>'note',''))<>''))
$$;
REVOKE ALL ON FUNCTION public.transfer_has_private_notes(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_has_private_notes(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.guard_transfer_code_relationships() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF public.transfer_has_complex_relationships(NEW.animal_id) THEN RAISE EXCEPTION 'linked_records_require_support'; END IF;
IF public.transfer_has_private_notes(NEW.animal_id) THEN RAISE EXCEPTION 'private_notes_require_support'; END IF;
RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.transfer_link_safety_check() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
IF public.transfer_has_complex_relationships(OLD.id) THEN RAISE EXCEPTION 'linked_records_require_support'; END IF;
IF public.transfer_has_private_notes(OLD.id) THEN RAISE EXCEPTION 'private_notes_require_support'; END IF;
END IF;
RETURN NEW; END $$;
COMMENT ON FUNCTION public.transfer_has_private_notes(uuid) IS 'Conservative transfer refusal for nonempty notes/note in medical and feeding arrays; preserve source history without copying it across ownership.';