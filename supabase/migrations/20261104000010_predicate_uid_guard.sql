-- ============================================================================
-- 20261104000010 — R170 : ferme l'oracle d'appartenance/rôle des prédicats RLS
-- ----------------------------------------------------------------------------
-- DÉFAUT (oracle d'information)
--   Les prédicats `is_org_member(uid, org_id)`, `is_org_admin(p_uid, p_org_id)`,
--   `has_permission(p_uid, p_org, res, act, …)`,
--   `can_manage_invitations(p_uid, p_org_id)` et `org_descendants(p_uid)`
--   sont SECURITY DEFINER et EXECUTABLES par `authenticated` (PostgREST les
--   expose en RPC). Or ils acceptent un `uid` ARBITRAIRE : un membre authentifié
--   pouvait donc appeler `is_org_member('<uuid X>', '<org Y>')` et lire
--   `true/false` — révélant l'appartenance, le rôle admin, une permission ou la
--   hiérarchie d'organisation d'un AUTRE utilisateur (reconnaissance / fuite de
--   métadonnées d'accès inter-organisations).
--   MESURÉ (2026-11-04, instance hhgovvrnalibhgpakswi) : depuis une session
--   `authenticated`, `is_org_member('<uuid arbitraire>', <org réelle>)` renvoie
--   sans erreur → oracle OUVERT. (Les policies, elles, passent TOUJOURS
--   `initplan_uid()` — vérifié : 0 policy n'utilise un uid ≠ `initplan_uid()`.)
--
-- CORRECTIF
--   Garde interne : le `uid` reçu doit valoir `initplan_uid()` (= `auth.uid()`,
--   le `sub` du JWT). Un appel RPC direct avec un uid arbitraire lève 42501.
--   Les policies continuent de fonctionner (elles passent `initplan_uid()`).
--   On NE PEUT PAS utiliser un `REVOKE EXECUTE` : VÉRIFIÉ en base que l'évaluation
--   d'une policy exige l'EXECUTE sur le prédicat (sinon `permission denied for
--   function`) — le REVOKE casserait toute la RLS.
--
-- CAS PARTICULIER `can_manage_invitations`
--   `settle_invitation_claim` (SECURITY DEFINER, appelé par un trigger) appelle
--   `can_manage_invitations(issued_by_uuid, org)` avec l'uid de l'ÉMETTEUR de
--   l'invitation (≠ JWT de l'accepteur). La garde y est donc conditionnée à
--   `pg_trigger_depth() = 0` : un appel RPC direct (profondeur 0) est refusé si
--   l'uid ≠ auth.uid(), tandis que l'appel interne au déclencheur reste permis.
--
-- APPELANTS INTERNES VÉRIFIÉS (2026-11-04) : `upsert_profile` appelle
--   `is_org_admin(auth.uid(), …)` (OK) ; `settle_invitation_claim` appelle
--   `can_manage_invitations(issued_by_uuid, …)` (couvert par la dérogation
--   trigger) ; aucun autre appelant, aucun trigger, aucune policy hors
--   `initplan_uid()`. Les règles de sync PowerSync utilisent du SQL direct (pas
--   ces fonctions) : non affectées.
--
-- CODE D'ERREUR : 42501 (insufficient_privilege) — cohérent avec les autres
--   gardes RBAC de la base. Ces fonctions ne sont pas appelées par l'upload
--   PowerSync (qui passe par les policies avec `initplan_uid()`).
--
-- RÉVERSIBILITÉ : rollback/20261104000010_rollback.sql (restaure les corps SQL
--   d'origine, sans garde).
-- ============================================================================

-- 1) is_org_member -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_variable
DECLARE
  result boolean;
BEGIN
  IF uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: uid doit valoir auth.uid()'
      USING ERRCODE = '42501';
  END IF;
  SELECT
    CASE
      WHEN org_id IS NULL
        OR btrim(org_id) = ''
        OR org_id IN ('__no_org__', 'no-org')
      THEN false
      ELSE
        EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = uid AND p.org_id = org_id
        )
        OR EXISTS (
          SELECT 1 FROM public.org_memberships m
           WHERE m.user_id = uid AND m.org_id = org_id
             AND m.status IN ('ACTIVE', 'PENDING')
        )
        OR EXISTS (
          SELECT 1 FROM public.org_admins a
           WHERE a.admin_profile_id = uid AND a.org_id = org_id
             AND a.status = 'ACTIVE'
        )
    END
  INTO result;
  RETURN result;
END;
$function$;

-- 2) is_org_admin ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_admin(p_uid uuid, p_org_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result boolean;
BEGIN
  IF p_uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: p_uid doit valoir auth.uid()'
      USING ERRCODE = '42501';
  END IF;
  SELECT p_org_id IS NOT NULL
     AND p_org_id NOT IN ('__no_org__', 'no-org')
     AND (
       EXISTS (
         SELECT 1 FROM public.org_admins a
          WHERE a.admin_profile_id = p_uid AND a.org_id = p_org_id
            AND a.status = 'ACTIVE'
       )
       OR EXISTS (
         SELECT 1 FROM public.profiles p
          WHERE p.id = p_uid AND p.org_id = p_org_id AND p.role = 'ADMIN'
       )
       OR EXISTS (
         SELECT 1 FROM public.org_memberships m
          WHERE m.user_id = p_uid AND m.org_id = p_org_id
            AND m.status = 'ACTIVE' AND m.role = 'ADMIN'
       )
     )
  INTO result;
  RETURN result;
END;
$function$;

-- 3) has_permission ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid uuid, p_org text, p_resource text, p_action text,
  p_scope_res text DEFAULT NULL, p_scope_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result boolean;
BEGIN
  IF p_uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: p_uid doit valoir auth.uid()'
      USING ERRCODE = '42501';
  END IF;
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
  INTO result;
  RETURN result;
END;
$function$;

-- 4) can_manage_invitations --------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result boolean;
BEGIN
  -- Appel direct (hors déclencheur) : l'uid doit être l'appelant. L'appel
  -- interne de `settle_invitation_claim` (profondeur de trigger > 0) porte
  -- l'uid de l'ÉMETTEUR et reste donc autorisé.
  IF pg_trigger_depth() = 0
     AND p_uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: p_uid doit valoir auth.uid()'
      USING ERRCODE = '42501';
  END IF;
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = p_uid AND p.org_id = p_org_id
         AND p.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = p_uid AND m.org_id = p_org_id
         AND m.status = 'ACTIVE'
         AND m.role IN ('ADMIN', 'PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
  INTO result;
  RETURN result;
END;
$function$;

-- 5) org_descendants ---------------------------------------------------------
-- Même oracle (authenticated-executable, `p_uid` arbitraire → révèle la
-- hiérarchie d'organisation d'un tiers). AUCUN appelant (vérifié : ni vue, ni
-- policy, ni fonction, ni trigger, ni code client) → garde inconditionnelle.
CREATE OR REPLACE FUNCTION public.org_descendants(p_uid uuid)
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_uid IS DISTINCT FROM public.initplan_uid() THEN
    RAISE EXCEPTION 'PREDICATE_UID_MISMATCH: p_uid doit valoir auth.uid()'
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH RECURSIVE fam AS (
    SELECT o.id FROM public.organizations o
     WHERE o.id = (SELECT p.org_id FROM public.profiles p WHERE p.id = p_uid)
    UNION ALL
    SELECT c.id FROM public.organizations c JOIN fam f ON c.parent_org_id = f.id
  )
  SELECT id FROM fam;
END;
$function$;
