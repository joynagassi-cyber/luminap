-- ============================================================================
-- 20261022000011 — fix: escalade de rôle via `profiles.role`
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   `profiles_update` autorise chaque utilisateur à modifier SA propre ligne
--   sans restriction de colonne. Or `profiles.role` sert de barrière
--   d'autorisation ailleurs :
--     * `org_admins_insert_merged` exige que le demandeur ait
--       `profiles.role = 'ADMIN'` sur l'organisation visée ;
--     * l'application teste `user.role === 'CENTRAL_ADMIN'`.
--   Un simple MEMBRE peut donc s'auto-promouvoir ADMIN puis s'insérer dans
--   `org_admins` — il devient administrateur de son organisation.
--
-- PREUVE (compte non-admin `lumina-org-unconfigured@lumina.dev`, via REST)
--   PATCH /rest/v1/profiles?id=eq.<moi>  {"role":"ADMIN"}          -> HTTP 200
--   POST  /rest/v1/org_admins {org_id:'org-e2e-unconf',
--                              admin_profile_id:<moi>}              -> HTTP 201
--   Les deux lignes ont été supprimées immédiatement après la preuve.
--
-- CORRECTIF
--   Trigger `guard_profile_role_immutable` : toute modification de
--   `profiles.role` par `authenticated`/`anon` est refusée, sauf si l'auteur
--   est administrateur actif de l'organisation du profil.
--
--   Le chemin légitime d'attribution d'un rôle (invitation réclamée via
--   `settle_invitation_claim`, edge `create_org`/`signup` en service_role)
--   n'est pas affecté : ces écritures s'exécutent hors des rôles
--   `authenticated`/`anon`.
--
-- RÉVERSIBILITÉ : rollback/20261022000011_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_profile_role_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.org_admins a
       WHERE a.admin_profile_id = initplan_uid()
         AND a.org_id = OLD.org_id
         AND a.status = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION 'ROLE_IMMUTABLE: profiles.role ne peut pas etre modifie directement'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_role_immutable ON public.profiles;
CREATE TRIGGER guard_profile_role_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_immutable();
