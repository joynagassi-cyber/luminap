-- Rollback — 20261026000001 (garde anti-cycle de la fédération)
-- Réversible : supprime le trigger et les fonctions. Aucune donnée touchée.
DROP TRIGGER IF EXISTS trg_orgs_no_cycle ON public.organizations;
DROP FUNCTION IF EXISTS public.org_assert_no_cycle();
DROP FUNCTION IF EXISTS public.org_would_cycle(text, text);
