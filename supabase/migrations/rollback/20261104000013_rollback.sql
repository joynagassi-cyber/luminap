-- Rollback R173 — restaure la branche `group_member` NON liée au demandeur
-- (état d'origine, avant correctif). La garde PREDICATE_UID_MISMATCH est
-- conservée (elle provient de R170, non concernée par ce rollback).

CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid uuid,
  p_org text,
  p_resource text,
  p_action text,
  p_scope_res text DEFAULT NULL::text,
  p_scope_id text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result boolean;
BEGIN
  IF p_uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: p_uid doit valoir auth.uid()' USING ERRCODE = '42501';
  END IF;
  WITH applicable AS (
    SELECT g.effect FROM public.grants g
     WHERE g.resource = p_resource AND g.action = p_action
       AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > now())
       AND g.org_id = p_org
       AND (g.scope_resource IS NULL OR (g.scope_resource = p_scope_res AND g.scope_id = p_scope_id))
       AND (
         (g.subject_type = 'user' AND g.subject_id = p_uid::text)
         OR (g.subject_type = 'role' AND EXISTS (SELECT 1 FROM public.org_memberships m WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE' AND m.role = g.subject_id))
         OR (g.subject_type = 'tag' AND g.subject_id IN (SELECT ta.tag_id::text FROM public.tag_assignments ta WHERE ta.user_id = p_uid AND ta.org_id = p_org))
         OR (g.subject_type = 'org_member' AND g.subject_id IN (SELECT m.id::text FROM public.org_memberships m WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE'))
         OR (g.subject_type = 'group_member' AND g.subject_id IN (SELECT gm.id::text FROM public.group_memberships gm JOIN public.members mm ON mm.id = gm.member_id WHERE mm.org_id = p_org))
       )
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'deny') THEN false
    WHEN EXISTS (SELECT 1 FROM public.org_memberships m JOIN public.role_permissions rp ON rp.role = m.role AND rp.permission = p_resource || ':' || p_action WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE') THEN true
    WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'allow') THEN true
    ELSE false END
  INTO result;
  RETURN result;
END;
$function$;
