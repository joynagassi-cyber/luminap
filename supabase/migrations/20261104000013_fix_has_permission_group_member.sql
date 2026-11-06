-- ============================================================================
-- 20261104000013 — R173 : `has_permission` — branche `group_member` non liée
--                   au demandeur (octroi de privilège latent)
-- ----------------------------------------------------------------------------
-- DÉFAUT (octroi de privilège, latent)
--   Dans `has_permission`, la branche `group_member` résolvait le sujet ainsi :
--
--     (g.subject_type = 'group_member' AND g.subject_id IN (
--        SELECT gm.id::text
--          FROM public.group_memberships gm
--          JOIN public.members mm ON mm.id = gm.member_id
--         WHERE mm.org_id = p_org))
--
--   Elle ne contraint JAMAIS `mm.id` (le membre) à `p_uid` (le demandeur). Une
--   autorisation ciblant un membership de groupe accordait donc la permission à
--   TOUS les membres de l'organisation, au lieu du seul titulaire.
--
--   POURQUOI C'EST LATENT (pas de fuite mesurée, 2026-11-04) :
--     • la table `grants` est VIDE (0 ligne) : aucun grant `group_member`
--       n'existe ;
--     • la convention de liaison est `members.id = user_id` (voir
--       `settle_invitation_claim` qui insère `members.id = resulting_user_id`) :
--       la branche est donc structurellement cohérente avec `mm.id = p_uid` ;
--     • `group_memberships` est VIDE et aucun `members.id` ne correspond à un
--       profil → aucun chemin exploitable aujourd'hui.
--
--   Le défaut reste réel : dès qu'un grant `group_member` serait créé, le
--   privilège fuiterait à toute l'organisation (élévation horizontale).
--
-- CORRECTIF
--   La branche devient une EXISTS liant le membership au demandeur :
--
--     (g.subject_type = 'group_member' AND EXISTS (
--        SELECT 1 FROM public.group_memberships gm
--          JOIN public.members mm ON mm.id = gm.member_id
--         WHERE gm.id::text = g.subject_id
--           AND mm.org_id   = p_org
--           AND mm.id       = p_uid::text))
--
--   Les autres branches (`user`, `role`, `tag`, `org_member`) contraignent déjà
--   le demandeur (`= p_uid` / `user_id = p_uid`) : inchangées. La garde
--   `PREDICATE_UID_MISMATCH` (R170) est conservée à l'identique.
--
-- RÉVERSIBILITÉ : rollback/20261104000013_rollback.sql
-- ============================================================================

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
         OR (g.subject_type = 'group_member' AND EXISTS (
               SELECT 1
                 FROM public.group_memberships gm
                 JOIN public.members mm ON mm.id = gm.member_id
                WHERE gm.id::text = g.subject_id
                  AND mm.org_id   = p_org
                  AND mm.id       = p_uid::text))
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
