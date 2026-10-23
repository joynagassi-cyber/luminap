-- ============================================================================
-- ROLLBACK de 20261022000009
-- ----------------------------------------------------------------------------
-- Rétablit l'état d'avant : EXECUTE rendu à anon/PUBLIC sur ces fonctions et
-- `initplan_uid` sans search_path figé.
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.upsert_profile(uuid, text, text, text, text, text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, text) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_descendants(uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_invitations(uuid, text) TO PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.initplan_uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$function$;
