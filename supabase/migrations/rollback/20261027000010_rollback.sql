-- Rollback — 20261027000010 (cloisonnement des grants par organisation)
-- Réversible. ATTENTION : la suppression de `grants.org_id` ré-ouvre la fuite
-- inter-org (un grant s'applique à nouveau dans toutes les orgs).
DROP POLICY IF EXISTS grants_read_org ON public.grants;
CREATE POLICY grants_read_org ON public.grants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS grants_insert_admin ON public.grants;
DROP POLICY IF EXISTS grants_update_admin ON public.grants;

DROP INDEX IF EXISTS public.idx_grants_org;
DROP INDEX IF EXISTS public.idx_grants_org_active;
ALTER TABLE public.grants DROP COLUMN IF EXISTS org_id;

-- Restaure has_permission sans contrainte d'org (version 20261026000002).
CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid uuid, p_org text, p_resource text, p_action text,
  p_scope_res text DEFAULT NULL, p_scope_id text DEFAULT NULL
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH applicable AS (
    SELECT g.effect FROM public.grants g
     WHERE g.resource = p_resource AND g.action = p_action
       AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > now())
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
    ELSE false END;
$function$;
