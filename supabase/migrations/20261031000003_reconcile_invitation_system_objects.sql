-- ============================================================================
-- 20261031000003 — Réconciliation R17 : objets du fichier historique
-- `20260909000002_create_invitation_system.sql` jamais appliqué en l'état.
-- ----------------------------------------------------------------------------
-- CONTEXTE (R17 — dérive migrations ↔ base)
--   Le fichier horodaté `20260909000002_create_invitation_system.sql` du dépôt
--   n'a JAMAIS été enregistré comme appliqué : son contenu a été remplacé en
--   base par la migration `invitation_system_v3` (version tracker
--   `20260921174834`), appliquée via l'éditeur SQL/MCP.
--
-- AUDIT (2026-10-31) — recoupement exhaustif dépôt ↔ base :
--   * 40/40 tables, 39/39 fonctions, 31/31 triggers, 1/1 vue : présents,
--     SAUF 3 objets déclarés uniquement par ce fichier historique :
--       - fonction  `mark_expired_invitations()`
--       - trigger   `update_invitations_updated_at`
--       - trigger   `update_invitation_claims_updated_at`
--
-- REDONDANCE MESURÉE (ces 3 objets ne sont pas fonctionnellement nécessaires) :
--   * l'expiration est déjà appliquée EN LIGNE par `settle_invitation_claim`
--     (`now_ts > inv.expires_at OR inv.status = 'EXPIRED'`) ;
--   * le client met `updated_at` à jour explicitement dans ses écritures
--     (`UPDATE invitations SET status='REVOKED', updated_at = ?`), et le trigger
--     de règlement positionne `updated_at` lui-même.
--   Ils sont néanmoins recréés ici pour rendre la fidélité dépôt ↔ base
--   **exacte** (delta = 0), de façon idempotente et sans effet destructeur.
--
-- RÉVERSIBILITÉ : rollback/20261031000003_rollback.sql
-- ============================================================================

-- ── Fonction de maintenance (marquage des invitations expirées) ──
CREATE OR REPLACE FUNCTION public.mark_expired_invitations()
RETURNS void LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitations
  SET status = 'EXPIRED', updated_at = now()
  WHERE status = 'ACTIVE' AND expires_at < now();
END;
$$;

-- ── Trigger updated_at : invitations ──
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Trigger updated_at : invitation_claims ──
DROP TRIGGER IF EXISTS update_invitation_claims_updated_at ON public.invitation_claims;
CREATE TRIGGER update_invitation_claims_updated_at
  BEFORE UPDATE ON public.invitation_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
