-- Rollback de 20261031000001 (R141) — restaure les politiques d'écriture sur
-- `is_org_member` seul (état antérieur à R141) et retire la permission ajoutée.

DELETE FROM public.role_permissions WHERE permission = 'finance:manage';

DROP POLICY IF EXISTS accounts_insert ON public.accounts;
CREATE POLICY accounts_insert ON public.accounts
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS accounts_update ON public.accounts;
CREATE POLICY accounts_update ON public.accounts
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS accounts_delete ON public.accounts;
CREATE POLICY accounts_delete ON public.accounts
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS caisses_insert ON public.caisses;
CREATE POLICY caisses_insert ON public.caisses
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS caisses_update ON public.caisses;
CREATE POLICY caisses_update ON public.caisses
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS caisses_delete ON public.caisses;
CREATE POLICY caisses_delete ON public.caisses
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS org_budgets_insert ON public.org_budgets;
CREATE POLICY org_budgets_insert ON public.org_budgets
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_budgets_update ON public.org_budgets;
CREATE POLICY org_budgets_update ON public.org_budgets
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_budgets_delete ON public.org_budgets;
CREATE POLICY org_budgets_delete ON public.org_budgets
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS org_budget_lines_insert ON public.org_budget_lines;
CREATE POLICY org_budget_lines_insert ON public.org_budget_lines
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_budget_lines_update ON public.org_budget_lines;
CREATE POLICY org_budget_lines_update ON public.org_budget_lines
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_budget_lines_delete ON public.org_budget_lines;
CREATE POLICY org_budget_lines_delete ON public.org_budget_lines
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS pledges_insert ON public.pledges;
CREATE POLICY pledges_insert ON public.pledges
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS pledges_update ON public.pledges;
CREATE POLICY pledges_update ON public.pledges
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS pledges_delete ON public.pledges;
CREATE POLICY pledges_delete ON public.pledges
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS giving_campaigns_insert ON public.giving_campaigns;
CREATE POLICY giving_campaigns_insert ON public.giving_campaigns
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS giving_campaigns_update ON public.giving_campaigns;
CREATE POLICY giving_campaigns_update ON public.giving_campaigns
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS giving_campaigns_delete ON public.giving_campaigns;
CREATE POLICY giving_campaigns_delete ON public.giving_campaigns
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS giving_donors_insert ON public.giving_donors;
CREATE POLICY giving_donors_insert ON public.giving_donors
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS giving_donors_update ON public.giving_donors;
CREATE POLICY giving_donors_update ON public.giving_donors
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS giving_donors_delete ON public.giving_donors;
CREATE POLICY giving_donors_delete ON public.giving_donors
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS transaction_giving_insert ON public.transaction_giving;
CREATE POLICY transaction_giving_insert ON public.transaction_giving
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS transaction_giving_update ON public.transaction_giving;
CREATE POLICY transaction_giving_update ON public.transaction_giving
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS transaction_giving_delete ON public.transaction_giving;
CREATE POLICY transaction_giving_delete ON public.transaction_giving
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS tax_receipts_insert ON public.tax_receipts;
CREATE POLICY tax_receipts_insert ON public.tax_receipts
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS tax_receipts_update ON public.tax_receipts;
CREATE POLICY tax_receipts_update ON public.tax_receipts
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS tax_receipts_delete ON public.tax_receipts;
CREATE POLICY tax_receipts_delete ON public.tax_receipts
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS budget_lines_insert ON public.budget_lines;
CREATE POLICY budget_lines_insert ON public.budget_lines
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) )));
DROP POLICY IF EXISTS budget_lines_update ON public.budget_lines;
CREATE POLICY budget_lines_update ON public.budget_lines
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) )))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) )));
DROP POLICY IF EXISTS budget_lines_delete ON public.budget_lines;
CREATE POLICY budget_lines_delete ON public.budget_lines
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), ( SELECT e.org_id FROM events e JOIN event_budgets eb ON (e.id = eb.event_id) WHERE (eb.id = budget_lines.event_budget_id) )));

DROP POLICY IF EXISTS event_budgets_insert ON public.event_budgets;
CREATE POLICY event_budgets_insert ON public.event_budgets
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) )));
DROP POLICY IF EXISTS event_budgets_update ON public.event_budgets;
CREATE POLICY event_budgets_update ON public.event_budgets
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) )))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) )));
DROP POLICY IF EXISTS event_budgets_delete ON public.event_budgets;
CREATE POLICY event_budgets_delete ON public.event_budgets
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = event_budgets.event_id) )));

DROP POLICY IF EXISTS cotisations_insert ON public.cotisations;
CREATE POLICY cotisations_insert ON public.cotisations
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) )));
DROP POLICY IF EXISTS cotisations_update ON public.cotisations;
CREATE POLICY cotisations_update ON public.cotisations
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) )))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) )));
DROP POLICY IF EXISTS cotisations_delete ON public.cotisations;
CREATE POLICY cotisations_delete ON public.cotisations
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), ( SELECT events.org_id FROM events WHERE (events.id = cotisations.culte_id) )));

DROP POLICY IF EXISTS group_memberships_insert ON public.group_memberships;
CREATE POLICY group_memberships_insert ON public.group_memberships
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) )));
DROP POLICY IF EXISTS group_memberships_update ON public.group_memberships;
CREATE POLICY group_memberships_update ON public.group_memberships
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) )))
  WITH CHECK (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) )));
DROP POLICY IF EXISTS group_memberships_delete ON public.group_memberships;
CREATE POLICY group_memberships_delete ON public.group_memberships
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), ( SELECT members.org_id FROM members WHERE (members.id = group_memberships.member_id) )));

DROP POLICY IF EXISTS org_units_insert ON public.org_units;
CREATE POLICY org_units_insert ON public.org_units
  FOR INSERT TO authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_units_update ON public.org_units;
CREATE POLICY org_units_update ON public.org_units
  FOR UPDATE TO authenticated
  USING (is_org_member(initplan_uid(), org_id))
  WITH CHECK (is_org_member(initplan_uid(), org_id));
DROP POLICY IF EXISTS org_units_delete ON public.org_units;
CREATE POLICY org_units_delete ON public.org_units
  FOR DELETE TO authenticated USING (is_org_member(initplan_uid(), org_id));

