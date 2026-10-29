-- ============================================================================
-- 20261029000004 — ADMIN : créer des annexes + superviser la famille d'orgs
-- ----------------------------------------------------------------------------
-- DÉCISION PROPRIÉTAIRE (2026-10-29)
--   Un porteur `ADMIN` doit pouvoir :
--     - créer une organisation ANNEXE rattachée à la sienne ;
--     - superviser et VOIR l'activité de ces annexes.
--
--   Les politiques `orgs_insert_merged` / `orgs_select_merged` ne connaissaient
--   que la table `org_admins`. Un `ADMIN` canonique (défini par
--   `profiles.role='ADMIN'`) n'y figure pas nécessairement → il ne pouvait pas
--   créer d'annexe. On ajoute une branche `ADMIN` :
--     - INSERT : autorisé si `parent_org_id` est NULL (racine) ou si l'ADMIN
--       administre l'organisation parente (`is_org_admin` couvre le rôle
--       canon ADMIN sur sa propre organisation) ;
--     - SELECT : un ADMIN voit les organisations filles de la sienne.
--
--   La lecture de la famille complète (descendants récursifs) est déjà assurée
--   par `orgs_select_federation_recursive` (id IN org_descendants(uid)) et la
--   vue `org_family`, toutes deux fondées sur `profiles.org_id` — un ADMIN y
--   est donc déjà couvert sans modification.
--
-- RÉVERSIBILITÉ : rollback/20261029000004_rollback.sql
-- ============================================================================

DROP POLICY IF EXISTS orgs_insert_merged ON public.organizations;
CREATE POLICY orgs_insert_merged ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- (existant) porteur d'un grant admin central actif
    (initplan_uid() IN (
      SELECT org_admins.admin_profile_id FROM public.org_admins
       WHERE org_admins.status = 'ACTIVE'
    ))
    -- (existant) admin de l'organisation parente visée
    OR EXISTS (
      SELECT 1 FROM public.org_admins
       WHERE org_admins.org_id = COALESCE(organizations.parent_org_id, 'org-central')
         AND org_admins.status = 'ACTIVE'
         AND org_admins.admin_profile_id = initplan_uid()
    )
    -- (R109) ADMIN canonique : racine, ou annexe sous une org qu'il administre
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = initplan_uid()
         AND p.role = 'ADMIN'
         AND (
           organizations.parent_org_id IS NULL
           OR public.is_org_admin(initplan_uid(), organizations.parent_org_id)
         )
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
    -- (R109) ADMIN canonique : voit les annexes de son organisation
    OR (parent_org_id IN (
      SELECT p.org_id FROM public.profiles p
       WHERE p.id = initplan_uid() AND p.role = 'ADMIN'
    ))
  );
