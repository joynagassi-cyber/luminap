-- Rollback 20261026000007 — retire l'invariant « ≥1 propriétaire ».
DROP TRIGGER IF EXISTS trg_org_admins_not_last ON public.org_admins;
DROP FUNCTION IF EXISTS public.org_assert_not_last_admin();
