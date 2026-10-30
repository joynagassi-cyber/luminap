-- Rollback de 20261030000001 — restaure l'état antérieur des politiques
-- UPDATE/DELETE sur `audit_entries` (telles que mesurées avant le durcissement).
CREATE POLICY audit_entries_delete ON public.audit_entries
  FOR DELETE TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

CREATE POLICY audit_entries_update ON public.audit_entries
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
