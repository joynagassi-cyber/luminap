-- ============================================================================
-- 20261022000014 — fix: contournement par DELETE + INSERT du profil
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE, résiduel après 20261022000011)
--   `guard_profile_role_immutable` ne se déclenche que sur UPDATE. Or
--   `profiles_delete` autorise un utilisateur à supprimer SA ligne et
--   `profiles_insert_self` l'autorise à la recréer. Il pouvait donc
--   contourner la protection :
--     DELETE /profiles?id=eq.<moi>                       -> 204
--     POST   /profiles {id:<moi>, role:'ADMIN'}          -> 201, role=ADMIN
--   (Preuve exécutée sur le compte non-admin
--   `lumina-org-unconfigured@lumina.dev` ; profil restauré ensuite.)
--
-- CORRECTIF
--   Trigger `guard_profile_role_insert` : un profil créé par
--   `authenticated`/`anon` ne peut pas naître avec un rôle privilégié
--   (seul 'MEMBRE' est accepté). Les créations légitimes s'exécutent hors de
--   ces rôles (`handle_new_user`, `upsert_profile` en SECURITY DEFINER,
--   edge `signup` en service_role) et ne sont pas affectées.
--
-- RÉVERSIBILITÉ : rollback/20261022000014_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_profile_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM 'MEMBRE'
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'ROLE_NOT_ALLOWED: un profil ne peut pas etre cree avec un role privilegie'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_role_insert ON public.profiles;
CREATE TRIGGER guard_profile_role_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_insert();
