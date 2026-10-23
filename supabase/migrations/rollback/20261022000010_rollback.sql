-- ============================================================================
-- ROLLBACK de 20261022000010
-- ----------------------------------------------------------------------------
-- Rétablit la policy unique `om_all_merged` (NON SÛRE : autorise l'auto-ajout
-- dans n'importe quelle organisation).
-- ============================================================================
DROP POLICY IF EXISTS om_select ON public.org_memberships;
DROP POLICY IF EXISTS om_insert ON public.org_memberships;
DROP POLICY IF EXISTS om_update ON public.org_memberships;
DROP POLICY IF EXISTS om_delete ON public.org_memberships;

CREATE POLICY om_all_merged ON public.org_memberships
  FOR ALL
  USING (
    user_id = initplan_uid()
    OR EXISTS (
      SELECT 1 FROM public.org_admins a
       WHERE a.admin_profile_id = initplan_uid()
         AND a.org_id = org_memberships.org_id
         AND a.status = 'ACTIVE'
    )
  )
  WITH CHECK (
    user_id = initplan_uid()
    OR EXISTS (
      SELECT 1 FROM public.org_admins a
       WHERE a.admin_profile_id = initplan_uid()
         AND a.org_id = org_memberships.org_id
         AND a.status = 'ACTIVE'
    )
  );

DROP FUNCTION IF EXISTS public.is_org_admin(uuid, text);
