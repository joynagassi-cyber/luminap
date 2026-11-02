-- ============================================================================
-- Rollback de 20261101000004 — injection d'organisation via INSERT de profil
-- ----------------------------------------------------------------------------
-- Restaure l'état AVANT durcissement : suppression du trigger INSERT et
-- rétablissement de `upsert_profile` tel que déployé (sans bornage d'org sur le
-- chemin INSERT).
--
-- ⚠️ Cette restauration RÉINTRODUIT la faille de fuite inter-organisation
-- (cf. en-tête de la migration). À n'exécuter que pour revenir à l'état
-- antérieur documenté.
-- ============================================================================

DROP TRIGGER IF EXISTS guard_profile_org_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_org_insert();

CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_role text DEFAULT NULL::text,
  p_org_id text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result public.profiles;
  v_role text := NULLIF(TRIM(p_role), '');
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;

  IF v_role IS NOT NULL
     AND NOT public.is_org_admin(
           auth.uid(),
           coalesce(NULLIF(TRIM(p_org_id), ''),
                    (SELECT org_id FROM public.profiles WHERE id = p_user_id))
         ) THEN
    RAISE EXCEPTION 'ROLE_NOT_ALLOWED: seul un administrateur de l''organisation peut attribuer un role'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, org_id, status)
  VALUES (
    p_user_id,
    coalesce(p_first_name, ''),
    coalesce(p_last_name,  ''),
    coalesce(v_role,       'MEMBRE'),
    coalesce(NULLIF(TRIM(p_org_id), ''), '__no_org__'),
    coalesce(p_status,     'ACTIVE')
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = coalesce(NULLIF(TRIM(p_first_name), ''), profiles.first_name),
    last_name  = coalesce(NULLIF(TRIM(p_last_name),  ''), profiles.last_name),
    role       = coalesce(v_role, profiles.role),
    status     = coalesce(NULLIF(TRIM(p_status),     ''), profiles.status),
    updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$function$;
