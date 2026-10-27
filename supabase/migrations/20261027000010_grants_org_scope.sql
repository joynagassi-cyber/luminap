-- ============================================================================
-- 20261027000010 — RBAC organisationnel : cloisonnement des grants par org
-- ----------------------------------------------------------------------------
-- DÉFAUT (réel, mesuré 2026-10-26)
--   `public.grants` n'avait AUCUNE colonne `org_id` et sa seule politique de
--   lecture était `USING (true)`. Conséquences :
--     1. Un grant `subject_type='user'` accordait la capacité dans TOUTES les
--        organisations où l'utilisateur est membre (fuite inter-org) ;
--     2. Toute session authentifiée lisait l'intégralité des grants (fuite
--        d'information : qui a quoi, dans quelle org).
--   `has_permission` ne contraignait donc pas un grant à l'organisation
--   demandée : `has_permission(u, 'org-A', ...)` pouvait renvoyer true à cause
--   d'un grant émis pour `org-B`.
--
-- CORRECTIF
--   1. `grants.org_id TEXT NOT NULL DEFAULT '__no_org__'` + index.
--      Les lignes historiques (aucune en base au 2026-10-26) restent lisibles
--      mais ne s'appliquent à aucune organisation réelle.
--   2. Lecture org-scopée : un membre ne lit que les grants de SES orgs
--      ACTIVE ; un admin d'org lit ceux de son org.
--   3. Écriture réservée à `is_org_admin(initplan_uid(), org_id)` (INSERT et
--      UPDATE) — l'admin gère les capacités DANS son org, jamais ailleurs.
--   4. `has_permission` contraint chaque grant à `g.org_id = p_org`.
--   5. Le trigger `settle_invitation_claim` renseigne `org_id = inv.org_id`
--      sur les grants qu'il matérialise (voir migration 20261027000011).
--
-- RÉVERSIBILITÉ : rollback/20261027000010_rollback.sql
-- ============================================================================

-- ── 1) Colonne org_id + index ───────────────────────────────────────────────
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT '__no_org__';

CREATE INDEX IF NOT EXISTS idx_grants_org ON public.grants (org_id);
CREATE INDEX IF NOT EXISTS idx_grants_org_active
  ON public.grants (org_id, resource, action) WHERE revoked_at IS NULL;

-- ── 2) Lecture org-scopée ───────────────────────────────────────────────────
DROP POLICY IF EXISTS grants_read_org ON public.grants;
CREATE POLICY grants_read_org ON public.grants
  FOR SELECT TO authenticated
  USING (
    public.is_org_admin(initplan_uid(), org_id)
    OR org_id IN (
      SELECT m.org_id FROM public.org_memberships m
       WHERE m.user_id = initplan_uid() AND m.status = 'ACTIVE'
    )
  );

-- ── 3) Écriture admin-only (dans l'org de l'admin) ──────────────────────────
DROP POLICY IF EXISTS grants_insert_admin ON public.grants;
CREATE POLICY grants_insert_admin ON public.grants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));

DROP POLICY IF EXISTS grants_update_admin ON public.grants;
CREATE POLICY grants_update_admin ON public.grants
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(initplan_uid(), org_id))
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));

-- ── 4) has_permission : chaque grant est contraint à l'org demandée ─────────
CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid        uuid,
  p_org        text,
  p_resource   text,
  p_action     text,
  p_scope_res  text DEFAULT NULL,
  p_scope_id   text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH applicable AS (
    SELECT g.effect
      FROM public.grants g
     WHERE g.resource = p_resource
       AND g.action   = p_action
       AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > now())
       -- CLOISONNEMENT : le grant ne vaut que dans son organisation.
       AND g.org_id = p_org
       AND (
         g.scope_resource IS NULL
         OR (g.scope_resource = p_scope_res AND g.scope_id = p_scope_id)
       )
       AND (
         (g.subject_type = 'user'         AND g.subject_id = p_uid::text)
         OR (g.subject_type = 'role'      AND EXISTS (
               SELECT 1 FROM public.org_memberships m
                WHERE m.user_id = p_uid AND m.org_id = p_org
                  AND m.status = 'ACTIVE' AND m.role = g.subject_id))
         OR (g.subject_type = 'tag'       AND g.subject_id IN (
               SELECT ta.tag_id::text FROM public.tag_assignments ta
                WHERE ta.user_id = p_uid AND ta.org_id = p_org))
         OR (g.subject_type = 'org_member' AND g.subject_id IN (
               SELECT m.id::text FROM public.org_memberships m
                WHERE m.user_id = p_uid AND m.org_id = p_org
                  AND m.status = 'ACTIVE'))
         OR (g.subject_type = 'group_member' AND g.subject_id IN (
               SELECT gm.id::text FROM public.group_memberships gm
                 JOIN public.members mm ON mm.id = gm.member_id
                WHERE mm.org_id = p_org))
       )
  )
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'deny') THEN false
      WHEN EXISTS (
        SELECT 1
          FROM public.org_memberships m
          JOIN public.role_permissions rp
            ON rp.role = m.role AND rp.permission = p_resource || ':' || p_action
         WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE'
      ) THEN true
      WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'allow') THEN true
      ELSE false
    END;
$function$;

REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.has_permission(uuid, text, text, text, text, text) IS
  'Phase 4 + RBAC org — décision UNIQUE de permission, CLOISONNÉE par organisation (deny prioritaire ; rôles canon via role_permissions ; grants allow org-scopés). Miroir de src/lib/permissions.ts#evaluatePermission.';
