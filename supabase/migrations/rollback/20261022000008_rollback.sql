-- ============================================================================
-- ROLLBACK de 20261022000008
-- ----------------------------------------------------------------------------
-- Rétablit l'état d'avant (NON SÛR : la vue org_family contourne de nouveau la
-- RLS et la policy de fédération lit la vue directement).
-- ============================================================================

-- 3) Vue : retirer security_invoker
ALTER VIEW public.org_family RESET (security_invoker);

-- 2) Policy d'origine (lecture directe de la vue)
DROP POLICY IF EXISTS orgs_select_federation_recursive ON public.organizations;
CREATE POLICY orgs_select_federation_recursive ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_family.org_id FROM org_family
       WHERE org_family.ancestor = (
         SELECT profiles.org_id FROM profiles WHERE profiles.id = auth.uid()
       )
    )
    OR id = (SELECT profiles.org_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- 1) Helper : supprimer
DROP FUNCTION IF EXISTS public.org_descendants(p_uid uuid);
