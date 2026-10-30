-- ============================================================================
-- 20261026000002 — Phase 4 : RBAC fin — décision unique `has_permission`
-- ----------------------------------------------------------------------------
-- DÉFAUT (réel)
--   La décision de permission n'existait QUE côté TS (`rbac.PERMISSION_MATRIX`
--   + `federation.canAccess`). La base n'avait AUCUNE fonction `has_permission` :
--   la RLS et le client pouvaient diverger, et « une décision unique DB↔TS »
--   (contrat §Phase 4) était impossible à prouver.
--
-- CORRECTIF
--   1. `role_permissions` : table de vérité des rôles canon, GÉNÉRÉE depuis
--      `PERMISSION_MATRIX` (src/lib/rbac.ts) → mêmes tests DB et TS.
--   2. `grants.effect` ('allow'|'deny') : support du **deny prioritaire**.
--   3. `has_permission(uid, org, resource, action, scope_res, scope_id)` :
--      LA décision unique, miroir exact de `src/lib/permissions.ts#evaluatePermission`.
--
-- Règles (identiques DB ↔ TS) :
--   1. deny explicite applicable (même portée) → refus.
--   2. rôle canon ACTIF dans l'org détenant resource:action → accord.
--   3. grant allow actif (non révoqué/expiré) couvrant la portée → accord.
--   4. sinon → refus.
--
-- RÉVERSIBILITÉ : rollback/20261026000002_rollback.sql
-- ============================================================================

-- ── 1) Table de vérité rôle → permission (générée depuis PERMISSION_MATRIX) ──
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role       TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.role_permissions (role, permission) VALUES
  -- R109 TRANCHÉ (20261029000001) : ADMIN = 15e rôle canonique, toutes perms.
  ('ADMIN', 'transaction:create'),
  ('ADMIN', 'transaction:read'),
  ('ADMIN', 'transaction:update'),
  ('ADMIN', 'transaction:approve'),
  ('ADMIN', 'transaction:reject'),
  ('ADMIN', 'transaction:delete'),
  ('ADMIN', 'versement:create'),
  ('ADMIN', 'versement:approve'),
  ('ADMIN', 'group:create'),
  ('ADMIN', 'group:read'),
  ('ADMIN', 'group:update'),
  ('ADMIN', 'group:delete'),
  ('ADMIN', 'event:create'),
  ('ADMIN', 'event:read'),
  ('ADMIN', 'event:update'),
  ('ADMIN', 'event:delete'),
  ('ADMIN', 'report:read'),
  ('ADMIN', 'report:export'),
  ('ADMIN', 'member:create'),
  ('ADMIN', 'member:read'),
  ('ADMIN', 'member:update'),
  ('ADMIN', 'member:delete'),
  ('ADMIN', 'cotisation:manage'),
  ('ADMIN', 'finance:manage'),
  ('ADMIN', 'admin:settings'),
  ('ADMIN', 'admin:roles'),
  ('ADMIN', 'invitation:create'),
  ('ADMIN', 'invitation:revoke'),
  ('ADMIN', 'invitation:manage'),
  ('ANCIEN', 'cotisation:manage'),
  ('ANCIEN', 'invitation:create'),
  ('ANCIEN', 'invitation:manage'),
  ('ANCIEN', 'invitation:revoke'),
  ('ANCIEN', 'event:create'),
  ('ANCIEN', 'event:read'),
  ('ANCIEN', 'event:update'),
  ('ANCIEN', 'group:create'),
  ('ANCIEN', 'group:read'),
  ('ANCIEN', 'group:update'),
  ('ANCIEN', 'member:read'),
  ('ANCIEN', 'member:update'),
  ('ANCIEN', 'report:export'),
  ('ANCIEN', 'report:read'),
  ('ANCIEN', 'transaction:approve'),
  ('ANCIEN', 'transaction:create'),
  ('ANCIEN', 'transaction:read'),
  ('ANCIEN', 'transaction:reject'),
  ('ANCIEN', 'versement:approve'),
  ('BENEVOLE', 'event:read'),
  ('BENEVOLE', 'member:read'),
  ('BENEVOLE', 'report:read'),
  ('BENEVOLE', 'transaction:read'),
  ('COMPTABLE', 'event:read'),
  ('COMPTABLE', 'report:export'),
  ('COMPTABLE', 'report:read'),
  ('COMPTABLE', 'transaction:read'),
  ('DIACRE', 'cotisation:manage'),
  ('DIACRE', 'event:read'),
  ('DIACRE', 'group:read'),
  ('DIACRE', 'member:read'),
  ('DIACRE', 'report:read'),
  ('DIACRE', 'transaction:approve'),
  ('DIACRE', 'transaction:read'),
  ('MEMBRE', 'event:read'),
  ('MEMBRE', 'transaction:read'),
  ('PASTEUR_ASSOCIE', 'cotisation:manage'),
  ('PASTEUR_ASSOCIE', 'event:create'),
  ('PASTEUR_ASSOCIE', 'event:read'),
  ('PASTEUR_ASSOCIE', 'event:update'),
  ('PASTEUR_ASSOCIE', 'group:read'),
  ('PASTEUR_ASSOCIE', 'member:read'),
  ('PASTEUR_ASSOCIE', 'report:export'),
  ('PASTEUR_ASSOCIE', 'report:read'),
  ('PASTEUR_ASSOCIE', 'transaction:approve'),
  ('PASTEUR_ASSOCIE', 'transaction:read'),
  ('PASTEUR_ASSOCIE', 'transaction:reject'),
  ('PASTEUR_JEUNESSE', 'cotisation:manage'),
  ('PASTEUR_JEUNESSE', 'event:create'),
  ('PASTEUR_JEUNESSE', 'event:read'),
  ('PASTEUR_JEUNESSE', 'event:update'),
  ('PASTEUR_JEUNESSE', 'group:read'),
  ('PASTEUR_JEUNESSE', 'member:read'),
  ('PASTEUR_JEUNESSE', 'report:read'),
  ('PASTEUR_JEUNESSE', 'transaction:approve'),
  ('PASTEUR_JEUNESSE', 'transaction:read'),
  ('PASTEUR_PRINCIPAL', 'admin:roles'),
  ('PASTEUR_PRINCIPAL', 'invitation:create'),
  ('PASTEUR_PRINCIPAL', 'invitation:manage'),
  ('PASTEUR_PRINCIPAL', 'invitation:revoke'),
  ('PASTEUR_PRINCIPAL', 'admin:settings'),
  ('PASTEUR_PRINCIPAL', 'cotisation:manage'),
  ('PASTEUR_PRINCIPAL', 'finance:manage'),
  ('PASTEUR_PRINCIPAL', 'event:create'),
  ('PASTEUR_PRINCIPAL', 'event:delete'),
  ('PASTEUR_PRINCIPAL', 'event:read'),
  ('PASTEUR_PRINCIPAL', 'event:update'),
  ('PASTEUR_PRINCIPAL', 'group:create'),
  ('PASTEUR_PRINCIPAL', 'group:delete'),
  ('PASTEUR_PRINCIPAL', 'group:read'),
  ('PASTEUR_PRINCIPAL', 'group:update'),
  ('PASTEUR_PRINCIPAL', 'member:create'),
  ('PASTEUR_PRINCIPAL', 'member:read'),
  ('PASTEUR_PRINCIPAL', 'member:update'),
  ('PASTEUR_PRINCIPAL', 'report:export'),
  ('PASTEUR_PRINCIPAL', 'report:read'),
  ('PASTEUR_PRINCIPAL', 'transaction:approve'),
  ('PASTEUR_PRINCIPAL', 'transaction:create'),
  ('PASTEUR_PRINCIPAL', 'transaction:delete'),
  ('PASTEUR_PRINCIPAL', 'transaction:read'),
  ('PASTEUR_PRINCIPAL', 'transaction:reject'),
  ('PASTEUR_PRINCIPAL', 'transaction:update'),
  ('PASTEUR_PRINCIPAL', 'versement:approve'),
  ('PASTEUR_PRINCIPAL', 'versement:create'),
  ('RESPONSABLE_DEPARTEMENT', 'cotisation:manage'),
  ('RESPONSABLE_DEPARTEMENT', 'event:create'),
  ('RESPONSABLE_DEPARTEMENT', 'event:read'),
  ('RESPONSABLE_DEPARTEMENT', 'event:update'),
  ('RESPONSABLE_DEPARTEMENT', 'group:read'),
  ('RESPONSABLE_DEPARTEMENT', 'member:read'),
  ('RESPONSABLE_DEPARTEMENT', 'member:update'),
  ('RESPONSABLE_DEPARTEMENT', 'report:read'),
  ('RESPONSABLE_DEPARTEMENT', 'transaction:create'),
  ('RESPONSABLE_DEPARTEMENT', 'transaction:read'),
  ('RESPONSABLE_DEPARTEMENT', 'transaction:update'),
  ('RESPONSABLE_GROUPE', 'cotisation:manage'),
  ('RESPONSABLE_GROUPE', 'event:create'),
  ('RESPONSABLE_GROUPE', 'event:read'),
  ('RESPONSABLE_GROUPE', 'group:read'),
  ('RESPONSABLE_GROUPE', 'member:read'),
  ('RESPONSABLE_GROUPE', 'transaction:create'),
  ('RESPONSABLE_GROUPE', 'transaction:read'),
  ('RESPONSABLE_GROUPE', 'transaction:update'),
  ('SECRETAIRE', 'event:create'),
  ('SECRETAIRE', 'event:delete'),
  ('SECRETAIRE', 'event:read'),
  ('SECRETAIRE', 'event:update'),
  ('SECRETAIRE', 'group:read'),
  ('SECRETAIRE', 'member:create'),
  ('SECRETAIRE', 'member:read'),
  ('SECRETAIRE', 'member:update'),
  ('SECRETAIRE', 'report:read'),
  ('SECRETAIRE_ADJOINT', 'event:create'),
  ('SECRETAIRE_ADJOINT', 'event:read'),
  ('SECRETAIRE_ADJOINT', 'event:update'),
  ('SECRETAIRE_ADJOINT', 'group:read'),
  ('SECRETAIRE_ADJOINT', 'member:read'),
  ('TREASURIER', 'cotisation:manage'),
  ('TREASURIER', 'finance:manage'),
  ('TREASURIER', 'event:create'),
  ('TREASURIER', 'event:read'),
  ('TREASURIER', 'event:update'),
  ('TREASURIER', 'group:create'),
  ('TREASURIER', 'invitation:create'),
  ('TREASURIER', 'invitation:manage'),
  ('TREASURIER', 'invitation:revoke'),
  ('TREASURIER', 'group:delete'),
  ('TREASURIER', 'group:read'),
  ('TREASURIER', 'group:update'),
  ('TREASURIER', 'member:create'),
  ('TREASURIER', 'member:read'),
  ('TREASURIER', 'member:update'),
  ('TREASURIER', 'report:export'),
  ('TREASURIER', 'report:read'),
  ('TREASURIER', 'transaction:approve'),
  ('TREASURIER', 'transaction:create'),
  ('TREASURIER', 'transaction:delete'),
  ('TREASURIER', 'transaction:read'),
  ('TREASURIER', 'transaction:update'),
  ('TREASURIER', 'versement:approve'),
  ('TREASURIER', 'versement:create'),
  ('TREASURIER_ADJOINT', 'cotisation:manage'),
  ('TREASURIER_ADJOINT', 'finance:manage'),
  ('TREASURIER_ADJOINT', 'event:create'),
  ('TREASURIER_ADJOINT', 'event:read'),
  ('TREASURIER_ADJOINT', 'event:update'),
  ('TREASURIER_ADJOINT', 'member:read'),
  ('TREASURIER_ADJOINT', 'report:read'),
  ('TREASURIER_ADJOINT', 'transaction:approve'),
  ('TREASURIER_ADJOINT', 'transaction:create'),
  ('TREASURIER_ADJOINT', 'transaction:read'),
  ('TREASURIER_ADJOINT', 'transaction:update')
ON CONFLICT (role, permission) DO NOTHING;

-- ── 2) Deny prioritaire : colonne `effect` sur grants ───────────────────────
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS effect TEXT NOT NULL DEFAULT 'allow';
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grants_effect_check'
  ) THEN
    ALTER TABLE public.grants
      ADD CONSTRAINT grants_effect_check CHECK (effect IN ('allow','deny'));
  END IF;
END $$;

-- ── 3) Décision unique ──────────────────────────────────────────────────────
--   `scope_res`/`scope_id` : NULL ⇒ on exige un grant GLOBAL (portée NULL).
--   Un grant scopé ne couvre que la portée EXACTE demandée.
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
       AND (
         -- portée : grant global, ou portée exacte demandée
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
      -- 1. deny prioritaire
      WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'deny') THEN false
      -- 2. rôle canon ACTIF détenant la permission
      WHEN EXISTS (
        SELECT 1
          FROM public.org_memberships m
          JOIN public.role_permissions rp
            ON rp.role = m.role AND rp.permission = p_resource || ':' || p_action
         WHERE m.user_id = p_uid AND m.org_id = p_org AND m.status = 'ACTIVE'
      ) THEN true
      -- 3. grant allow
      WHEN EXISTS (SELECT 1 FROM applicable WHERE effect = 'allow') THEN true
      ELSE false
    END;
$function$;

-- ── 4) Surface ──────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text, text, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.has_permission(uuid, text, text, text, text, text) IS
  'Phase 4 — décision UNIQUE de permission (deny prioritaire ; rôles canon via role_permissions ; grants allow). Miroir de src/lib/permissions.ts#evaluatePermission.';
