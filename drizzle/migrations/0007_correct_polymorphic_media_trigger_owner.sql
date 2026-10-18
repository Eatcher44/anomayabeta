CREATE OR REPLACE FUNCTION public.sync_trusted_media_bindings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE kind text; urls text[]; u uuid; entity uuid; photo_url text; j jsonb; BEGIN
kind:=CASE TG_TABLE_NAME WHEN 'animals' THEN 'animal' WHEN 'breeder_profiles' THEN 'breeder' ELSE 'archive' END;
IF TG_OP='DELETE' THEN DELETE FROM public.trusted_media_bindings WHERE entity_kind=kind AND entity_id=OLD.id; RETURN OLD; END IF;
j:=to_jsonb(NEW); u:=COALESCE((j->>'user_id')::uuid,(j->>'original_owner_id')::uuid); entity:=NEW.id;
IF kind='animal' THEN
IF jsonb_typeof(j->'gallery_photos')<>'array' OR jsonb_array_length(j->'gallery_photos')>4 THEN RAISE EXCEPTION 'invalid_gallery'; END IF;
urls:=ARRAY[j->>'photo']||ARRAY(SELECT jsonb_array_elements_text(j->'gallery_photos'));
ELSIF kind='breeder' THEN urls:=ARRAY[j->>'logo_url',j->>'signature_url']; ELSE urls:=ARRAY[j->>'animal_photo']; END IF;
FOREACH photo_url IN ARRAY urls LOOP PERFORM public.bind_trusted_media(photo_url,kind,entity,u); END LOOP;
DELETE FROM public.trusted_media_bindings b USING public.trusted_media m WHERE b.media_id=m.id AND b.entity_kind=kind AND b.entity_id=entity AND NOT (m.canonical_url=ANY(array_remove(urls,NULL)));
RETURN NEW; END $$;