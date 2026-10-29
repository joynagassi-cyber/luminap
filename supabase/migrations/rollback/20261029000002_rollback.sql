-- Rollback de 20261029000002 — restaure les politiques d'écriture sur
-- `is_org_member` seul (état antérieur à R137).
DROP POLICY IF EXISTS transactions_insert ON public.transactions;
CREATE POLICY transactions_insert ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS transactions_update ON public.transactions;
CREATE POLICY transactions_update ON public.transactions
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS transactions_delete ON public.transactions;
CREATE POLICY transactions_delete ON public.transactions
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS versements_insert ON public.versements;
CREATE POLICY versements_insert ON public.versements
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS versements_update ON public.versements;
CREATE POLICY versements_update ON public.versements
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS versements_delete ON public.versements;
CREATE POLICY versements_delete ON public.versements
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS members_insert ON public.members;
CREATE POLICY members_insert ON public.members
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS members_update ON public.members;
CREATE POLICY members_update ON public.members
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS members_delete ON public.members;
CREATE POLICY members_delete ON public.members
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS events_insert ON public.events;
CREATE POLICY events_insert ON public.events
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS events_update ON public.events;
CREATE POLICY events_update ON public.events
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS events_delete ON public.events;
CREATE POLICY events_delete ON public.events
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS groups_insert ON public.groups;
CREATE POLICY groups_insert ON public.groups
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS groups_update ON public.groups;
CREATE POLICY groups_update ON public.groups
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS groups_delete ON public.groups;
CREATE POLICY groups_delete ON public.groups
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));
