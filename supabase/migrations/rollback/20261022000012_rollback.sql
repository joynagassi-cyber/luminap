-- ============================================================================
-- ROLLBACK de 20261022000012
-- ----------------------------------------------------------------------------
-- Rétablit la version d'upsert_profile SANS contrôle du rôle
-- (NON SÛRE : permet l'injection de role via le RPC).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_org_id text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result profiles;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;

  INSERT INTO profiles (id, first_name, last_name, role, org_id, status)
  VALUES (
    p_user_id,
    coalesce(p_first_name, ''),
    coalesce(p_last_name,  ''),
    coalesce(p_role,       'MEMBRE'),
    coalesce(NULLIF(TRIM(p_org_id), ''), '__no_org__'),
    coalesce(p_status,     'ACTIVE')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(NULLIF(TRIM(p_first_name), ''), profiles.first_name),
    last_name  = coalesce(NULLIF(TRIM(p_last_name),  ''), profiles.last_name),
    role       = coalesce(NULLIF(TRIM(p_role),       ''), profiles.role),
    status     = coalesce(NULLIF(TRIM(p_status),     ''), profiles.status),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$function$;
