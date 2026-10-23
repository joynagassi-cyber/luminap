-- ============================================================================
-- ROLLBACK de 20261022000006
-- ----------------------------------------------------------------------------
-- Rétablit l'état d'avant (NON SÛR) : les nouveaux inscrits sont de nouveau
-- rattachés à `org-1` et `upsert_profile` réécrit `org_id`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, org_id, status)
  VALUES (
    NEW.id, NEW.email,
    coalesce(NEW.raw_user_meta_data->>'first_name', split_part(coalesce(NEW.email, ''), '@', 1)),
    coalesce(NEW.raw_user_meta_data->>'last_name', ''),
    'MEMBRE', 'org-1', 'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE
    SET first_name = coalesce(EXCLUDED.first_name, profiles.first_name),
        last_name  = coalesce(EXCLUDED.last_name,  profiles.last_name),
        email      = coalesce(EXCLUDED.email,     profiles.email);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id uuid, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text, p_org_id text DEFAULT NULL::text, p_status text DEFAULT NULL::text
)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE result profiles;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;
  INSERT INTO profiles (id, first_name, last_name, role, org_id, status)
  VALUES (p_user_id, coalesce(p_first_name,''), coalesce(p_last_name,''),
          coalesce(p_role,'MEMBRE'), coalesce(p_org_id,'org-1'), coalesce(p_status,'ACTIVE'))
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(NULLIF(TRIM(p_first_name),''), profiles.first_name),
    last_name  = coalesce(NULLIF(TRIM(p_last_name), ''), profiles.last_name),
    role       = coalesce(NULLIF(TRIM(p_role),      ''), profiles.role),
    org_id     = coalesce(NULLIF(TRIM(p_org_id),    ''), profiles.org_id),
    status     = coalesce(NULLIF(TRIM(p_status),    ''), profiles.status),
    updated_at = now()
  RETURNING * INTO result;
  RETURN result;
END;
$function$;
