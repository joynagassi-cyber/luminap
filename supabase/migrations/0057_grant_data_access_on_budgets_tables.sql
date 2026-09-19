GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_budgets, public.org_budget_lines TO anon, authenticated, service_role;
GRANT SELECT ON public.org_budgets, public.org_budget_lines TO powersync_role;