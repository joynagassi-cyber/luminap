-- ============================================================================
-- 20261022000012 — fix: `upsert_profile` permettait l'injection de `role`
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   `upsert_profile` est SECURITY DEFINER : le trigger
--   `guard_profile_role_immutable` (20261022000011) ne le voit pas
--   (`current_user` = propriétaire, pas `authenticated`). Or il écrit
--   `role = coalesce(NULLIF(TRIM(p_role), ''), profiles.role)` : un client
--   pouvait donc s'auto-promouvoir en appelant le RPC.
--
-- PREUVE (compte non-admin, via REST)
--   POST /rest/v1/rpc/upsert_profile {"p_user_id":<moi>,"p_role":"ADMIN"}
--     -> HTTP 200, puis GET /profiles -> role = 'ADMIN'
--   (rôle restauré à 'MEMBRE' immédiatement après la preuve.)
--
-- CORRECTIF
--   `upsert_profile` refuse désormais `p_role` si l'appelant n'est pas
--   administrateur actif de l'organisation visée. Aucun code applicatif vivant
--   ne transmet `p_role` (`authService.setProfileRole` est du code mort) ;
--   l'attribution légitime d'un rôle passe par `settle_invitation_claim`
--   (invitation, SECURITY DEFINER) ou par l'edge `signup`/`create_org`
--   (service_role).
--
--   `p_org_id` reste accepté mais n'a d'effet que sur le chemin INSERT (le
--   ON CONFLICT ne modifie pas `org_id`) — vérifié : un appel
--   `p_org_id='org-1'` ne change pas l'organisation d'un profil existant.
--
-- RÉVERSIBILITÉ : rollback/20261022000012_rollback.sql
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
SET search_path = public, pg_temp
AS $function$
DECLARE
  result public.profiles;
  v_role text := NULLIF(TRIM(p_role), '');
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'NOT_YOUR_PROFILE: p_user_id does not match auth.uid()';
  END IF;

  -- Le rôle n'est modifiable que par un administrateur actif de l'organisation
  -- visée. Le client ne dispose d'aucun chemin légitime pour le faire.
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
