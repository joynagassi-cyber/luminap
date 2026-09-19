DO $$
BEGIN
  ALTER TABLE public.org_budgets ENABLE ROW LEVEL SECURITY;
  CREATE POLICY org_budgets_select ON public.org_budgets FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budgets_insert ON public.org_budgets FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budgets_update ON public.org_budgets FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budgets_delete ON public.org_budgets FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  ALTER TABLE public.org_budget_lines ENABLE ROW LEVEL SECURITY;
  CREATE POLICY org_budget_lines_select ON public.org_budget_lines FOR SELECT TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budget_lines_insert ON public.org_budget_lines FOR INSERT TO authenticated WITH CHECK (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budget_lines_update ON public.org_budget_lines FOR UPDATE TO authenticated USING (is_org_member(auth.uid(), org_id));
  CREATE POLICY org_budget_lines_delete ON public.org_budget_lines FOR DELETE TO authenticated USING (is_org_member(auth.uid(), org_id));

  CREATE INDEX IF NOT EXISTS idx_org_budgets_org ON public.org_budgets (org_id);
  CREATE INDEX IF NOT EXISTS idx_org_budgets_year ON public.org_budgets (org_id, fiscal_year);
  CREATE INDEX IF NOT EXISTS idx_org_bl_budget ON public.org_budget_lines (budget_id);
END
$$;