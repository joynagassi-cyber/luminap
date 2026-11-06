-- Rollback R170 — restaure les corps SQL d'origine des 4 prédicats (sans garde).
-- (État mesuré avant 20261104000010 ; cf. pg_get_functiondef le 2026-11-04.)

CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      WHEN is_org_member.org_id IS NULL
        OR btrim(is_org_member.org_id) = ''
        OR is_org_member.org_id IN ('__no_org__', 'no-org')
      THEN false
      ELSE
        EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = is_org_member.uid
             AND p.org_id = is_org_member.org_id
        )
        OR EXISTS (
          SELECT 1 FROM public.org_memberships m
           WHERE m.user_id = is_org_member.uid
             AND m.org_id = is_org_member.org_id
             AND m.status IN ('ACTIVE', 'PENDING')
        )
        OR EXISTS (
          SELECT 1 FROM public.org_admins a
           WHERE a.admin_profile_id = is_org_member.uid
             AND a.org_id = is_org_member.org_id
             AND a.status = 'ACTIVE'
        )
    END
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_uid uuid, p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_org_id IS NOT NULL
     AND p_org_id NOT IN ('__no_org__', 'no-org')
     AND (
       EXISTS (
         SELECT 1 FROM public.org_admins a
          WHERE a.admin_profile_id = p_uid
            AND a.org_id = p_org_id
            AND a.status = 'ACTIVE'
       )
       OR EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = p_uid
            AND p.org_id = p_org_id
            AND p.role = 'ADMIN'
       )
       OR EXISTS (
         SELECT 1 FROM public.org_memberships m
          WHERE m.user_id = p_uid
            AND m.org_id = p_org_id
            AND m.status = 'ACTIVE'
            AND m.role = 'ADMIN'
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid uuid, p_org text, p_resource text, p_action text,
  p_scope_res text DEFAULT NULL, p_scope_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH applicable AS (
    SELECT g.effect FROM public.grants g
     WHERE g.resource = p_resource AND g.action = p_action
       AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > now())
       AND g.org_id = p_org
       AND (g.scope_resource IS NULL
            OR (g.scope_resource = p_scope_res AND g.scope_id = p_scope_id))
       AND (
         (g.subject_type = 'user' AND g.subject_id = p_uid::text)
         OR (g.subject_type = 'role' AND EXISTS (
               SELECT 1 FROM public.org_memberships m
                WHERE m.user_id = p_uid AND m.org_id = p_org
                  AND m.status = 'ACTIVE' AND m.role = g.subject_id))
         OR (g.subject_type = 'tag' AND g.subject_id IN (
               SELECT ta.tag_id::text FROM public.tag_assignments ta
                WHERE ta.user_id = p_uid AND ta.org_id = p_org))
         OR (g.subject_type = 'org_member' AND g.subject_id IN (
               SELECT m.id::text FROM public.org_memberships m
                WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE'))
         OR (g.subject_type = 'group_member' AND g.subject_id IN (
               SELECT gm.id::text FROM public.group_memberships gm
                 JOIN public.members mm ON mm.id = gm.member_id
                WHERE mm.org_id = p_org))
       )
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'deny') THEN false
    WHEN EXISTS (SELECT 1 FROM public.org_memberships m
                   JOIN public.role_permissions rp
                     ON rp.role = m.role AND rp.permission = p_resource || ':' || p_action
                  WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE') THEN true
    WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'allow') THEN true
    ELSE false END
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
         AND p.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = p_uid
         AND m.org_id = p_org_id
         AND m.status = 'ACTIVE'
         AND m.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
$function$;

CREATE OR REPLACE FUNCTION public.org_descendants(p_uid uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE fam AS (
    SELECT o.id FROM public.organizations o
     WHERE o.id = (SELECT p.org_id FROM public.profiles p WHERE p.id = p_uid)
    UNION ALL
    SELECT c.id FROM public.organizations c JOIN fam f ON c.parent_org_id = f.id
  )
  SELECT id FROM fam;
$function$;
