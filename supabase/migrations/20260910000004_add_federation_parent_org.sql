-- ============================================================================
-- T2 — Federation : champ parent_org_id + RLS hiérarchique
-- ----------------------------------------------------------------------------
-- Permet aux organisations d'être imbriquées (ex. diocèse → paroisses)
-- Un admin central peut gérer sa "famille" d'orgs (parent + enfants)
-- ARCHIVED ≠ DELETE : on ne supprime jamais, on archive
-- ============================================================================

-- 1. Ajout du champ parent_org_id
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_org_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Index pour accélérer les requêtes de hiérarchie
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_org_id);

-- 3. RLS : un admin central lit sa famille d'orgs (parent + enfants directs)
CREATE POLICY "orgs_select_federation" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    -- Membre direct de l'organisation
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    -- OU admin central avec grant actif
    OR EXISTS (
      SELECT 1 FROM public.org_admins
      WHERE public.org_admins.org_id = organizations.id
        AND public.org_admins.status = 'ACTIVE'
        AND public.org_admins.admin_profile_id = auth.uid()
    )
    -- OU enfant d'une organisation gérée (parent_org_id)
    OR parent_org_id IN (
      SELECT public.org_admins.org_id
      FROM public.org_admins
      WHERE public.org_admins.status = 'ACTIVE'
        AND public.org_admins.admin_profile_id = auth.uid()
    )
  );

-- 4. UPDATE : un admin central peut modifier sa famille
CREATE POLICY "orgs_update_federation" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_admins
      WHERE public.org_admins.org_id = organizations.id
        AND public.org_admins.status = 'ACTIVE'
        AND public.org_admins.admin_profile_id = auth.uid()
    )
  );

-- 5. INSERT : création d'une org enfant
CREATE POLICY "orgs_insert_federation" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Admin central avec grant actif sur l'org parent
    EXISTS (
      SELECT 1 FROM public.org_admins
      WHERE public.org_admins.org_id = COALESCE(
        public.organizations.parent_org_id,
        'org-central'
      )
      AND public.org_admins.status = 'ACTIVE'
      AND public.org_admins.admin_profile_id = auth.uid()
    )
  );
