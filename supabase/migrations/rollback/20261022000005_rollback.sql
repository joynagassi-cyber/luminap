-- ============================================================================
-- ROLLBACK de 20261022000005
-- ----------------------------------------------------------------------------
-- Rétablit l'état d'avant : `settle_invitation_claim` de nouveau SECURITY
-- INVOKER (état bugué : used_count non incrémenté), helper de rôle de nouveau
-- exposé, et suppression du garde-fou `profiles.org_id`.
-- ============================================================================

-- A) settle_invitation_claim : revenir à SECURITY INVOKER
ALTER FUNCTION public.settle_invitation_claim(claim_id uuid) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.settle_invitation_claim(claim_id uuid) TO PUBLIC, anon;

-- Helper de rôle : rétablir l'exposition d'origine
GRANT EXECUTE ON FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text) TO PUBLIC, anon;

-- B) profiles : retirer le garde-fou
DROP TRIGGER IF EXISTS trg_guard_profile_org ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_org_immutable();
