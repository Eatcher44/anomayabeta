CREATE FUNCTION public.guard_transfer_related_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j jsonb; u uuid; ref uuid; key text; owner uuid; BEGIN
IF TG_OP='DELETE' THEN RETURN OLD; END IF;
j:=to_jsonb(NEW);u:=(j->>'user_id')::uuid;
FOREACH key IN ARRAY ARRAY['litter_id','father_id','father_animal_id','reproduction_id'] LOOP
ref:=(j->>key)::uuid;
IF ref IS NOT NULL THEN
IF key='litter_id' THEN SELECT user_id INTO owner FROM public.litters WHERE id=ref;
ELSIF key='reproduction_id' THEN SELECT user_id INTO owner FROM public.reproductions WHERE id=ref;
ELSE SELECT user_id INTO owner FROM public.animals WHERE id=ref; END IF;
IF owner IS DISTINCT FROM u THEN RAISE EXCEPTION 'foreign_related_reference'; END IF;
END IF; END LOOP;
IF TG_TABLE_NAME='rendezvous' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(j->'animal_ids') x WHERE NOT EXISTS(SELECT 1 FROM public.animals a WHERE a.id=x.value::uuid AND a.user_id=u)) THEN RAISE EXCEPTION 'foreign_appointment_reference'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_transfer_related_links() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['animals','litters','reproductions','rendezvous'] LOOP EXECUTE format('CREATE TRIGGER security_related_links BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_transfer_related_links()',t); END LOOP; END $$;
CREATE FUNCTION public.security_media_list_allowed(p_bucket text,p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT auth.uid() IS NOT NULL AND public.security_account_active(auth.uid()) AND (EXISTS(SELECT 1 FROM public.trusted_media m WHERE m.bucket=p_bucket AND m.object_path=p_path AND m.status='active' AND m.custodian_id=auth.uid()) OR (split_part(p_path,'/',1)=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.trusted_media m WHERE m.bucket=p_bucket AND m.object_path=p_path))) $$;
REVOKE ALL ON FUNCTION public.security_media_list_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.security_media_list_allowed(text,text) TO authenticated;
ALTER POLICY "Users can list their own animal photos" ON storage.objects USING(bucket_id='animal-photos' AND public.security_media_list_allowed(bucket_id,name));
ALTER POLICY "Users can read their own bug screenshots" ON storage.objects USING(bucket_id='bug-screenshots' AND public.security_media_list_allowed(bucket_id,name));