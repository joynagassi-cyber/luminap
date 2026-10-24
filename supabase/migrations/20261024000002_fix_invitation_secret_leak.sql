-- R91 — Fuite des secrets d'invitation => escalade de privilèges
--
-- Constat (prouvé sur l'instance dev, transaction annulée) :
--   * `invitations_select` était `is_org_member(initplan_uid(), org_id)` :
--     TOUT membre (y compris un simple MEMBRE, ou une adhésion PENDING)
--     pouvait lire `code`, `target_role`, `grants_payload` et `tags_payload`
--     de TOUTES les invitations de son organisation.
--   * `invitation_claims_insert` n'exige pas `resulting_user_id = auth.uid()`
--     (choix hors-ligne assumé : le claim porte un nouvel id PENDING).
--   * Le trigger `settle_invitation_claim()` (SECURITY DEFINER) applique
--     ensuite `inv.target_role` au profil `resulting_user_id`.
--
-- Enchaînement : un MEMBRE lisait le `id` d'une invitation ACTIVE à rôle
-- élevé, insérait un claim la ciblant pour son PROPRE profil, et se
-- retrouvait promu (reproduit : role_apres = 'ADMIN').
--
-- Correctif (minimal, sans toucher au chemin d'écriture/sync) :
--   1. `invitations_select` : les invitations sont des jetons porteurs
--      (code/QR remis hors-bande). Seuls les gestionnaires d'invitations
--      les voient en base — mêmes rôles que INSERT/UPDATE/DELETE. Le
--      destinataire n'a pas besoin de lire la ligne : il détient le JSON.
--   2. `invitation_claims_insert` (défense en profondeur) : interdire de
--      créer un claim au nom d'un profil DÉJÀ ACTIF. Le flux légitime crée
--      d'abord un profil PENDING (id aléatoire) puis le claim, donc il
--      reste autorisé quelle que soit l'ordre de synchronisation.

-- 1. Ne plus exposer les invitations à tous les membres.
DROP POLICY IF EXISTS invitations_select ON public.invitations;
CREATE POLICY invitations_select ON public.invitations
  FOR SELECT TO authenticated
  USING (can_manage_invitations(initplan_uid(), org_id));

-- 2. Défense en profondeur : pas de claim au nom d'un profil déjà ACTIF.
DROP POLICY IF EXISTS invitation_claims_insert ON public.invitation_claims;
CREATE POLICY invitation_claims_insert ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    initplan_uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id)
    AND (
      -- profil pas encore synchronisé (ordre de sync) : autorisé
      resulting_user_id IS NULL
      -- le claim porte sur un profil non actif (nouvel invité PENDING)
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = resulting_user_id AND p.status = 'ACTIVE'
      )
      -- ou l'appelant gère lui-même les invitations de cette organisation
      OR can_manage_invitations(
           initplan_uid(),
           (SELECT i.org_id FROM public.invitations i WHERE i.id = invitation_id)
         )
    )
  );
