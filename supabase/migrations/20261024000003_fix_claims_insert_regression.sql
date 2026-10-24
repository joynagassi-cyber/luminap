-- R91.b — Correctif de régression introduite par 20261024000002
--
-- Constat (prouvé sur l'instance dev, transaction annulée) :
--   20261024000002 a restreint `invitations_select` à `can_manage_invitations`.
--   Or la politique `invitation_claims_insert` qu'elle a posée contenait
--   `EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id)`.
--   Ce sous-`SELECT` s'exécute SOUS LA RLS DE L'APPELANT : un invité qui n'est
--   pas gestionnaire d'invitations ne « voit » pas la ligne `invitations`
--   (RLS), donc le `EXISTS` est faux et son claim est refusé (42501).
--   => le parcours légitime « un invité réclame un code » était cassé.
--
--   Preuve : profil PENDING inséré par un MEMBRE → 42501 (les policies
--   `profiles` n'autorisent l'INSERT que de sa propre ligne `id = auth.uid()`,
--   ce que le claim anonyme ne fait pas — le chemin d'écriture passe par le
--   trigger SECURITY DEFINER `handle_new_user`). Le claim PENDING était refusé
--   par le `EXISTS` ci-dessus.
--
-- Correctif :
--   1. `invitation_claims_insert` : retirer le `EXISTS` sur `invitations`.
--      L'existence de l'invitation est déjà garantie par la clé étrangère
--      `invitation_claims_invitation_id_fkey` (contrôle effectué hors RLS par
--      le déclencheur d'intégrité référentielle). La branche
--      `can_manage_invitations(...)` reste, mais elle n'est atteinte que par
--      un gestionnaire (qui, lui, voit la ligne) : sans danger.
--   2. Défense en profondeur déplacée dans le trigger SECURITY DEFINER
--      `settle_invitation_claim` (voir 20261024000004) : la vérification
--      « profil déjà ACTIF » y est fiable (le DEFINER voit toutes les lignes),
--      contrairement à une vérification en RLS, aveugle par construction.
--
-- RÉVERSIBILITÉ : rollback/20261024000003_rollback.sql

DROP POLICY IF EXISTS invitation_claims_insert ON public.invitation_claims;
CREATE POLICY invitation_claims_insert ON public.invitation_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    initplan_uid() IS NOT NULL
    AND (
      -- profil pas encore synchronisé (ordre de sync) : autorisé
      resulting_user_id IS NULL
      -- claim portant sur un profil non ACTIF (nouvel invité PENDING) :
      -- visible par l'appelant s'il s'agit de sa propre ligne, sinon
      -- invisible (RLS) donc considéré comme non-ACTIF : dans les deux cas
      -- le chemin légitime passe, et le self-claim sur un profil ACTIF est
      -- refusé (l'appelant voit sa propre ligne).
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
