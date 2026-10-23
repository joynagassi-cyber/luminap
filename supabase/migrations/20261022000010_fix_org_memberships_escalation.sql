-- ============================================================================
-- 20261022000010 — fix: escalade de privilèges via `org_memberships`
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   La policy unique `om_all_merged` (FOR ALL) sur `org_memberships` avait
--   pour condition : `user_id = initplan_uid() OR <admin de cette org>`.
--   La première branche autorise un utilisateur à écrire TOUTE ligne dont il
--   est le `user_id` — donc à **s'INSÉRER lui-même dans n'importe quelle
--   organisation** avec le rôle de son choix.
--
--   Comme `is_org_member()` considère une ligne `org_memberships` ACTIVE comme
--   une appartenance, et que de nombreuses tables (dont `org_units`) fondent
--   leurs policies sur `is_org_member`, cela ouvre en cascade l'écriture dans
--   les données d'autrui.
--
-- PREUVE (compte membre de `org-e2e`, via REST)
--   POST /rest/v1/org_memberships {org_id:'org-1', user_id:<moi>,
--                                  role:'PASTEUR_PRINCIPAL'} -> HTTP 201
--   puis POST /rest/v1/org_units {org_id:'org-1', ...} -> HTTP 201
--     (alors que le même INSERT sans membership préalable -> 42501)
--   Les deux lignes ont été supprimées immédiatement après la preuve.
--
-- CORRECTIF
--   Remplacer la policy unique par des policies par commande :
--     * SELECT : soi-même, ou administrateur de l'organisation ;
--     * INSERT : administrateur de l'organisation uniquement (plus
--       d'auto-adhésion) ;
--     * UPDATE : administrateur de l'organisation uniquement (plus
--       d'auto-promotion de rôle) ;
--     * DELETE : soi-même (quitter une organisation) ou administrateur.
--   Les chemins légitimes (invitation réclamée via `settle_invitation_claim`,
--   SECURITY DEFINER) ne sont pas affectés : ils n'exécutent pas de DML sous le
--   rôle du client.
--
-- RÉVERSIBILITÉ : rollback/20261022000010_rollback.sql
-- ============================================================================

-- Helper : administrateur d'une organisation (SECURITY DEFINER, non exposé à anon)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_uid uuid, p_org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT p_org_id IS NOT NULL
     AND p_org_id NOT IN ('__no_org__', 'no-org')
     AND EXISTS (
       SELECT 1 FROM public.org_admins a
        WHERE a.admin_profile_id = p_uid
          AND a.org_id = p_org_id
          AND a.status = 'ACTIVE'
     );
$function$;

REVOKE ALL ON FUNCTION public.is_org_admin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS om_all_merged ON public.org_memberships;

CREATE POLICY om_select ON public.org_memberships
  FOR SELECT TO authenticated
  USING (user_id = initplan_uid() OR public.is_org_admin(initplan_uid(), org_id));

CREATE POLICY om_insert ON public.org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));

CREATE POLICY om_update ON public.org_memberships
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(initplan_uid(), org_id))
  WITH CHECK (public.is_org_admin(initplan_uid(), org_id));

CREATE POLICY om_delete ON public.org_memberships
  FOR DELETE TO authenticated
  USING (user_id = initplan_uid() OR public.is_org_admin(initplan_uid(), org_id));
