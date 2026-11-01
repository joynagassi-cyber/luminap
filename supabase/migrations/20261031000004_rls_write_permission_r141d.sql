-- ============================================================================
-- 20261031000004 — R141.d : clôture du chantier d'autorisation d'ÉCRITURE.
-- Dernières politiques INSERT/UPDATE/DELETE restées sur `is_org_member` SEUL.
-- ----------------------------------------------------------------------------
-- SUITE de R137 (15 politiques), R141 (14 tables financières),
-- R141.b/c (8 tables non financières). Après ces trois lots, il ne restait que
-- 4 tables. Audit (2026-10-31, recoupement `pg_policies`) :
--
--   | Table               | Politiques restantes          | Traitement R141.d |
--   |---------------------|-------------------------------|-------------------|
--   | invitation_claims   | UPDATE                        | invitation:manage |
--   | notifications       | INSERT / UPDATE / DELETE      | admin:settings    |
--   | role_assignments    | INSERT / UPDATE / DELETE      | admin:settings    |
--   | audit_entries       | INSERT                        | LAISSÉ (correct)  |
--
--   * `invitations` était DÉJÀ gardée (`is_org_member AND
--     can_manage_invitations`) — non concernée.
--   * `audit_entries` INSERT : niveau membre **correct** — un journal d'audit
--     enregistre l'action de l'acteur lui-même ; restreindre à un rôle
--     priverait les non-managers de toute traçabilité. Le rendre « ajout seul »
--     (UPDATE/DELETE deny-all) est déjà fait par R140.
--
-- DÉCISION DE MAPPAGE (aucune nouvelle permission) :
--   * `invitation_claims` → `invitation:manage` (permission canon existante :
--     ADMIN, ANCIEN, PASTEUR_PRINCIPAL, TREASURIER — cohérente avec
--     `can_manage_invitations`).
--   * `notifications` / `role_assignments` → `admin:settings` (pas de
--     permission canon spécifique ; précédent R141.b/c : ADMIN +
--     PASTEUR_PRINCIPAL). `role_assignments` est une **table morte**
--     (0 référence dans tout le dépôt, hors sync-config).
--
-- SÛRETÉ (inchangée) : le chemin d'écriture de l'APPLICATION passe par
--   PowerSync (`powersync_role` porte BYPASSRLS — vérifié). Les triggers
--   `notify_*` s'exécutent dans ce contexte (BYPASSRLS) ou en DEFINER
--   (`notify_transaction_change`). Durcir la RLS REST ne peut donc pas casser
--   un flux applicatif ; ces politiques ne ferment que le client REST direct.
--
-- RÉVERSIBILITÉ : rollback/20261031000004_rollback.sql
-- ============================================================================

-- ── invitation_claims : UPDATE → invitation:manage ─────────────────────────
DROP POLICY IF EXISTS invitation_claims_update ON public.invitation_claims;
CREATE POLICY invitation_claims_update ON public.invitation_claims
  FOR UPDATE TO authenticated
  USING (
    is_org_member(initplan_uid(), (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_claims.invitation_id))
    AND has_permission(initplan_uid(), (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_claims.invitation_id), 'invitation', 'manage')
  )
  WITH CHECK (
    is_org_member(initplan_uid(), (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_claims.invitation_id))
    AND has_permission(initplan_uid(), (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_claims.invitation_id), 'invitation', 'manage')
  );

-- ── notifications : INSERT/UPDATE/DELETE → admin:settings ───────────────────
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

-- ── role_assignments (table morte) : INSERT/UPDATE/DELETE → admin:settings ──
DROP POLICY IF EXISTS role_assignments_insert ON public.role_assignments;
CREATE POLICY role_assignments_insert ON public.role_assignments
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS role_assignments_update ON public.role_assignments;
CREATE POLICY role_assignments_update ON public.role_assignments
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'))
  WITH CHECK (is_org_member(initplan_uid(), org_id)
              AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));

DROP POLICY IF EXISTS role_assignments_delete ON public.role_assignments;
CREATE POLICY role_assignments_delete ON public.role_assignments
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id)
         AND has_permission(initplan_uid(), org_id, 'admin', 'settings'));
