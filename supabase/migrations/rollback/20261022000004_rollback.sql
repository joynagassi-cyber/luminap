-- ============================================================================
-- ROLLBACK de 20261022000004_fix_invitations_write_role_gate.sql
-- ----------------------------------------------------------------------------
-- Rétablit l'état permissif d'avant (état NON SÛR : tout membre peut créer,
-- modifier et supprimer des invitations de son organisation, avec n'importe
-- quel target_role). À n'exécuter qu'en cas d'annulation réelle du durcissement.
-- ============================================================================

DROP POLICY IF EXISTS invitations_insert ON public.invitations;
CREATE POLICY invitations_insert ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS invitations_update ON public.invitations;
CREATE POLICY invitations_update ON public.invitations
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS invitations_delete ON public.invitations;
CREATE POLICY invitations_delete ON public.invitations
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

DROP FUNCTION IF EXISTS public.can_manage_invitations(uuid, text);
