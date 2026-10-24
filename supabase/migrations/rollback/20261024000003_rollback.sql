-- Rollback 20261024000003 — restaure la politique posée par 20261024000002
-- (celle qui contenait le `EXISTS` sur `invitations`, responsable de la
-- régression du claim par un non-gestionnaire).
DROP POLICY IF EXISTS invitation_claims_insert ON public.invitation_claims;
CREATE POLICY invitation_claims_insert ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    initplan_uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id)
    AND (
      resulting_user_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = resulting_user_id AND p.status = 'ACTIVE'
      )
      OR can_manage_invitations(
           initplan_uid(),
           (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_id)
         )
    )
  );
