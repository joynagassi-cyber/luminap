-- ============================================================================
-- 20260921000007 — Privileges d'écriture PowerSync pour les tables socle
-- ----------------------------------------------------------------------------
-- Gap majeur confirmé par l'audit de complétude : sans ce GRANT, la file
-- d'upload PowerSync des 4 tables socle (grants, tags, tag_assignments,
-- org_memberships) échouait en production — `powersync_role` n'avait que
-- SELECT hérité, contrairement au pattern des migrations 0045/0046/0057/0060
-- qui faisaient explicitement GRANT … TO powersync_role.
--
-- invitations + invitation_claims : ajoutés pour cohérence du pattern
-- (le flux E2E existant passait par le RLS om_grant_write + le trigger
-- SECURITY DEFINER, mais l'upload de la claim PENDING_SYNC nécessite
-- l'INSERT sur invitation_claims).
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grants
  TO powersync_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags
  TO powersync_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_assignments
  TO powersync_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_memberships
  TO powersync_role;
GRANT SELECT, INSERT, UPDATE ON public.invitations
  TO powersync_role;
GRANT SELECT, INSERT, UPDATE ON public.invitation_claims
  TO powersync_role;
