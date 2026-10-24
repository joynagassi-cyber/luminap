-- Rollback R91 — restaure les politiques d'origine (AVANT correctif).
-- ATTENTION : ce rollback réintroduit la fuite des secrets d'invitation et
-- l'escalade de privilèges prouvée (MEMBRE -> ADMIN). À n'utiliser que pour
-- revenir à l'état antérieur en connaissance de cause.

DROP POLICY IF EXISTS invitations_select ON public.invitations;
CREATE POLICY invitations_select ON public.invitations
  FOR SELECT TO authenticated
  USING (is_org_member(initplan_uid(), org_id));

DROP POLICY IF EXISTS invitation_claims_insert ON public.invitation_claims;
CREATE POLICY invitation_claims_insert ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    (initplan_uid() IS NOT NULL)
    AND (EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_claims.invitation_id))
  );
