-- ============================================================================
-- ROLLBACK de 20261022000007
-- ----------------------------------------------------------------------------
-- Rétablit l'état d'avant (NON SÛR : le sentinelle `__no_org__` fonde de
-- nouveau une appartenance, donc les profils sans organisation se lisent
-- entre eux).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE p.id = is_org_member.uid
              AND p.org_id = is_org_member.org_id
         )
      OR EXISTS (
           SELECT 1 FROM public.org_memberships m
            WHERE m.user_id = is_org_member.uid
              AND m.org_id = is_org_member.org_id
              AND m.status IN ('ACTIVE','PENDING')
         )
      OR EXISTS (
           SELECT 1 FROM public.org_admins a
            WHERE a.admin_profile_id = is_org_member.uid
              AND a.org_id = is_org_member.org_id
              AND a.status = 'ACTIVE'
         );
$function$;
