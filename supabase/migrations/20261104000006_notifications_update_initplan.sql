-- ============================================================================
-- 20261104000006 — Réalignement initplan de `notifications_update`
-- ----------------------------------------------------------------------------
-- DÉFAUT (mesuré, advisor `auth_rls_initplan`, 2026-11-04)
--   La migration R-H (`20261104000002_notifications_read_policy`) a recréé
--   `notifications_update` avec `is_org_member(auth.uid(), org_id)`. C'est la
--   SEULE policy du projet à appeler `auth.uid()` directement : toutes les
--   autres passent `initplan_uid()` (wrapper STABLE de `request.jwt.claims->>'sub'`).
--   Conséquence : `current_setting()` est ré-évalué pour chaque ligne au lieu
--   d'une seule fois (initplan) → WARN performance Supabase.
--
-- CORRECTIF (minimal, réversible, comportement identique)
--   Remplacer `auth.uid()` par `initplan_uid()` : même identité (le `sub` du
--   JWT), même sémantique (tout membre de l'org peut mettre à jour ; le
--   privilège colonne `GRANT UPDATE (is_read)` reste la borne d'écriture),
--   mais l'évaluation est hoistée. Aucune donnée ni droit modifié.
--
-- RÉVERSIBILITÉ : rollback/20261104000006_rollback.sql.
-- ============================================================================

ALTER POLICY notifications_update ON public.notifications
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
