-- Rollback de 20261029000001 — retire le rôle canonique ADMIN.
DELETE FROM public.role_permissions WHERE role = 'ADMIN';

CREATE OR REPLACE FUNCTION public.is_org_admin(p_uid uuid, p_org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_org_id IS NOT NULL
     AND p_org_id NOT IN ('__no_org__', 'no-org')
     AND EXISTS (
       SELECT 1 FROM public.org_admins a
        WHERE a.admin_profile_id = p_uid
          AND a.org_id = p_org_id
          AND a.status = 'ACTIVE'
     );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = p_uid
         AND p.org_id = p_org_id
         AND p.role IN ('PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = p_uid
         AND m.org_id = p_org_id
         AND m.status = 'ACTIVE'
         AND m.role IN ('PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    );
$function$;
