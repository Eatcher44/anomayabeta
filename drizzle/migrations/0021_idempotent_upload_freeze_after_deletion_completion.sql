CREATE OR REPLACE FUNCTION public.freeze_secure_uploads(p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
PERFORM public.security_mutation_lock();
IF NOT public.security_feature_allowed(p_uid,'deletion') THEN RETURN jsonb_build_object('error','temporarily_suspended'); END IF;
IF EXISTS(SELECT 1 FROM public.account_deletion_state WHERE user_id=p_uid AND phase='complete') THEN RETURN jsonb_build_object('pending',false); END IF;
IF public.deletion_has_foreign_relationships(p_uid) THEN RETURN jsonb_build_object('error','linked_records_require_support'); END IF;
INSERT INTO public.upload_deletion_freezes(user_id) VALUES(p_uid) ON CONFLICT DO NOTHING;
RETURN jsonb_build_object('pending',EXISTS(SELECT 1 FROM public.secure_uploads WHERE user_id=p_uid AND state='pending')); END $$;