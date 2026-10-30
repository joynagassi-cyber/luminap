-- Rollback de 20261031000004 (R141.d) — restaure les politiques d'origine
-- fondées sur `is_org_member` SEUL (état antérieur mesuré 2026-10-31).

DROP POLICY IF EXISTS invitation_claims_update ON public.invitation_claims;
CREATE POLICY invitation_claims_update ON public.invitation_claims
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), (SELECT invitations.org_id FROM public.invitations WHERE invitations.id = invitation_claims.invitation_id)))
  WITH CHECK (is_org_member(initplan_uid(), (SELECT invitations.org_id FROM public.invitations WHERE invitations.id = invitation_claims.invitation_id)));

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS notifications_delete ON public.notifications;
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS role_assignments_insert ON public.role_assignments;
CREATE POLICY role_assignments_insert ON public.role_assignments
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS role_assignments_update ON public.role_assignments;
CREATE POLICY role_assignments_update ON public.role_assignments
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS role_assignments_delete ON public.role_assignments;
CREATE POLICY role_assignments_delete ON public.role_assignments
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id));
