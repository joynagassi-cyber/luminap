-- Rollback de 20261031000003 (réconciliation R17) — retire les 3 objets
-- recréés pour la fidélité dépôt ↔ base (état antérieur : absents).

DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
DROP TRIGGER IF EXISTS update_invitation_claims_updated_at ON public.invitation_claims;
DROP FUNCTION IF EXISTS public.mark_expired_invitations();
