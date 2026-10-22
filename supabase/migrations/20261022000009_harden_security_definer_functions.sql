-- ============================================================================
-- 20261022000009 — durcissement des fonctions SECURITY DEFINER exposées
-- ----------------------------------------------------------------------------
-- Constats (advisors Supabase + inspection) :
--   * `upsert_profile` est exécutable par `anon` : un appel non authentifié
--     peut écrire un profil (auth.uid() NULL → l'appel échoue en pratique, mais
--     la surface ne doit pas exister).
--   * `initplan_uid` (appelée par ~143 policies) a un `search_path` mutable :
--     un `search_path` détourné pourrait rediriger `current_setting`. Risque
--     faible mais correction triviale.
--   * `is_org_member`, `org_descendants`, `current_org_id`,
--     `can_manage_invitations` sont exécutables par `anon` sans nécessité.
--
-- Correctif : retirer EXECUTE à `anon` (et PUBLIC) sur ces fonctions ;
-- `authenticated` conserve les droits nécessaires. `initplan_uid` reçoit un
-- `search_path` figé.
--
-- RÉVERSIBILITÉ : rollback/20261022000009_rollback.sql
-- ============================================================================

-- search_path figé (n'utilise que current_setting/NULLIF, tous dans pg_catalog)
CREATE OR REPLACE FUNCTION public.initplan_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, pg_temp
AS $function$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$function$;

-- Retirer la surface anonyme
REVOKE ALL ON FUNCTION public.upsert_profile(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_org_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_descendants(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_invitations(uuid, text) FROM PUBLIC, anon;
