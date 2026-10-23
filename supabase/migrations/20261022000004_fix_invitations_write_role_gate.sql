-- ============================================================================
-- 20261022000004 — fix: escalade de privilèges sur `invitations`
-- ----------------------------------------------------------------------------
-- DÉFAUT
--   La policy d'insertion d'invitation avait perdu sa restriction de rôle.
--   La migration 20260926000001_advisors_cleanup.sql:115 a réécrit la policy
--   avec un simple `is_org_member(...)` :
--
--     ALTER POLICY invitations_insert ON public.invitations
--       WITH CHECK (is_org_member(initplan_uid(), org_id));
--
--   en écrasant la version d'origine (20260909000002) qui exigeait en plus
--   que l'auteur soit PASTEUR_PRINCIPAL / ANCIEN / TREASURIER. Résultat : tout
--   membre de l'organisation peut émettre une invitation portant N'IMPORTE
--   QUEL `target_role`, y compris PASTEUR_PRINCIPAL.
--
-- PREUVE (compte org-e2e, role=MEMBRE, avant correctif) :
--   POST /rest/v1/invitations
--   {"org_id":"org-e2e","code":"ESCAL-…","target_role":"PASTEUR_PRINCIPAL",…}
--   -> HTTP 201 : invitation d'escalade créée par un simple membre.
--   (Cet artefact de test a été supprimé après vérification.)
--
-- DÉFAUT CONNEXE : `invitations_update` et `invitations_delete` n'étaient eux
-- aussi gardés que par `is_org_member(...)`. Un membre pouvait donc révoquer
-- ou SUPPRIMER toutes les invitations de l'organisation.
--
-- CORRECTIF — on restaure l'intention d'origine et on l'étend aux trois
-- verbes d'écriture, avec la même liste de rôles autorisés :
--   PASTEUR_PRINCIPAL | ANCIEN | TREASURIER
--
--   * SELECT  : inchangé (tout membre lit les invitations de son org).
--   * INSERT  : rôle autorisé + org.
--   * UPDATE  : rôle autorisé (USING) + le nouvel état reste dans l'org
--               (WITH CHECK) — couvre la révocation.
--   * DELETE  : rôle autorisé (destructif, jusque-là non gardé).
--
-- NOTE : la vérification porte sur `public.profiles` ET sur
-- `public.org_memberships` (les deux sources de rôle du projet) pour ne pas
-- bloquer un gestionnaire légitime dont le rôle n'existe que dans l'une des
-- deux tables.
--
-- RÉVERSIBILITÉ : rollback/20261022000004_rollback.sql rétablit la policy
-- permissive (état bugué).
-- ============================================================================

-- Fonction centralisée : l'utilisateur courant peut-il gérer les invitations
-- de l'organisation `p_org_id` ?
CREATE OR REPLACE FUNCTION public.can_manage_invitations(p_uid uuid, p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = p_uid
         AND p.org_id = p_org_id
         AND p.role IN ('PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    )
    OR EXISTS (
      SELECT 1 FROM public.org_memberships m
       WHERE m.user_id = p_uid
         AND m.org_id = p_org_id
         AND m.status = 'ACTIVE'
         AND m.role IN ('PASTEUR_PRINCIPAL', 'ANCIEN', 'TREASURIER')
    );
$function$;

DROP POLICY IF EXISTS invitations_insert ON public.invitations;
CREATE POLICY invitations_insert ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_member(initplan_uid(), org_id)
    AND can_manage_invitations(initplan_uid(), org_id)
  );

DROP POLICY IF EXISTS invitations_update ON public.invitations;
CREATE POLICY invitations_update ON public.invitations
  FOR UPDATE TO authenticated
  USING (
    is_org_member(initplan_uid(), org_id)
    AND can_manage_invitations(initplan_uid(), org_id)
  )
  WITH CHECK (
    is_org_member(initplan_uid(), org_id)
    AND can_manage_invitations(initplan_uid(), org_id)
  );

DROP POLICY IF EXISTS invitations_delete ON public.invitations;
CREATE POLICY invitations_delete ON public.invitations
  FOR DELETE TO authenticated
  USING (
    is_org_member(initplan_uid(), org_id)
    AND can_manage_invitations(initplan_uid(), org_id)
  );
