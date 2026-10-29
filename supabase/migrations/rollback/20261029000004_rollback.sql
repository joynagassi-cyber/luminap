-- Rollback de 20261029000004 — restaure orgs_insert_merged / orgs_select_merged
-- sans la branche ADMIN canonique.
DROP POLICY IF EXISTS orgs_insert_merged ON public.organizations;
CREATE POLICY orgs_insert_merged ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    (initplan_uid() IN (
      SELECT org_admins.admin_profile_id FROM public.org_admins
       WHERE org_admins.status = 'ACTIVE'
    ))
    OR EXISTS (
      SELECT 1 FROM public.org_admins
       WHERE org_admins.org_id = COALESCE(organizations.parent_org_id, 'org-central')
         AND org_admins.status = 'ACTIVE'
         AND org_admins.admin_profile_id = initplan_uid()
    )
  );

DROP POLICY IF EXISTS orgs_select_merged ON public.organizations;
CREATE POLICY orgs_select_merged ON public.organizations
  FOR SELECT TO authenticated
  USING (
    is_org_member(initplan_uid(), id)
    OR (id IN (SELECT profiles.org_id FROM public.profiles WHERE profiles.id = initplan_uid()))
    OR EXISTS (
      SELECT 1 FROM public.org_admins
       WHERE org_admins.org_id = organizations.id
         AND org_admins.status = 'ACTIVE'
         AND org_admins.admin_profile_id = initplan_uid()
    )
    OR (parent_org_id IN (
      SELECT org_admins.org_id FROM public.org_admins
       WHERE org_admins.status = 'ACTIVE'
         AND org_admins.admin_profile_id = initplan_uid()
    ))
  );
