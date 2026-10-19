CREATE OR REPLACE FUNCTION public.transfer_validate_selection(a public.animals, p_sel jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public','pg_temp' AS $$
DECLARE named jsonb:=public.transfer_named_items(a); item jsonb; BEGIN
IF p_sel IS NULL THEN RETURN '[]'::jsonb; END IF;
IF jsonb_typeof(p_sel)<>'array' OR jsonb_array_length(p_sel)>200 THEN RETURN NULL; END IF;
FOR item IN SELECT el FROM jsonb_array_elements(p_sel) AS t(el) LOOP
 IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>2 OR NOT (item ? 'id' AND item ? 'field') OR jsonb_typeof(item->'id')<>'string' OR item->>'field' NOT IN ('nom','produit') THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(named) AS n(el) WHERE n.el->>'id'=item->>'id' AND n.el ? (item->>'field')) THEN RETURN NULL; END IF;
END LOOP;
RETURN COALESCE((SELECT jsonb_agg(d.v ORDER BY d.v->>'id',d.v->>'field') FROM (SELECT DISTINCT jsonb_build_object('id',s.el->>'id','field',s.el->>'field') AS v FROM jsonb_array_elements(p_sel) AS s(el)) d),'[]'::jsonb); END $$;
REVOKE ALL ON FUNCTION public.transfer_validate_selection(public.animals,jsonb) FROM PUBLIC, anon, authenticated;