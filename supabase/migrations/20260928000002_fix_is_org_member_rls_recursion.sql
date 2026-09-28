-- 20260928000002 : rétablit is_org_member en SECURITY DEFINER — corrige la
-- récursion infinie RLS qui provoquait `ERROR 54001: stack depth limit
-- exceeded` sur TOUS les SELECT authentifiés.
--
-- Causale déterministe :
--   20260921000003 définit is_org_member en SECURITY DEFINER (owner
--   postgres, BYPASS RLS) — le design correct, qui casse la récursion :
--   la fonction lance des EXISTS sur public.profiles /
--   public.org_memberships / public.org_admins, et chaque table ayant son
--   propre policy qui appelle is_org_member ré-invoquait la fonction
--   → boucle infinie.
--   20260926000001 (advisors_cleanup) a passé la fonction en SECURITY
--   INVOKER sans revalider le schéma de récursion. Conséquence live :
--   pour le rôle `authenticated`, `SELECT count(*) FROM public.profiles`
--   déborde la stack Postgres (54001), toutes les requêtes de données
--   authentifiées tombent en erreur ou restent vides — symptômes UI :
--   page noire après signup/OAuth, dashboard qui n'apparaît qu'après
--   rechargement, navigation par icônes qui échoue, features inactives.
--
-- Fix (identique au design 20260921000003, le seul qui fonctionne) :
--   1. `ALTER FUNCTION public.is_org_member(uuid, text) SECURITY DEFINER;`
--      — owner postgres, BYPASS RLS interne, récursion brisée.
--      Sécurité : le paramètre `uid` est toujours `initplan_uid()` (claim
--      JWT signé, lu par PostgREST), jamais un argument de l'appelant.
--      La fonction ne produit aucun effet de bord sur les données.
--   2. `initplan_uid()` — déjà le corps SQL IMMUTABLE STRICT propre ;
--      on le re-créé ici pour que le SSoT match l'état live.

-- 1) is_org_member : corps SECURITY DEFINER complet (SSoT du
--    20260921000003, le seul qui casse la récursion).
CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.org_id = org_id)
      OR EXISTS (SELECT 1 FROM public.org_memberships m
                WHERE m.user_id = uid AND m.org_id = org_id
                  AND m.status IN ('ACTIVE','PENDING'))
      OR EXISTS (SELECT 1 FROM public.org_admins a
                WHERE a.admin_profile_id = uid AND a.org_id = org_id
                  AND a.status = 'ACTIVE');
$$;
ALTER FUNCTION public.is_org_member(uuid, text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, text) TO authenticated;
-- PUBLIC (qui inclut anon et tout rôle héritant) ne doit pas invoquer cette
-- fonction de son propre chef ; seule l'invocation depuis une policy RLS
-- (rôle courant = authenticated via PostgREST) est prévue.
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, text) FROM PUBLIC;

-- 2) initplan_uid : corps propre + search_path figé (advisor
--    function_search_path_mutable). SSoT aligné sur l'état live.
CREATE OR REPLACE FUNCTION public.initplan_uid()
RETURNS uuid
LANGUAGE sql IMMUTABLE STRICT
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION public.initplan_uid() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.initplan_uid() FROM PUBLIC;

-- 3) Garde-fou : handle_new_user est un trigger GoTrue (SECURITY DEFINER,
--    exécuté par l'owner postgres sur l'INSERT de auth.users), pas un RPC.
--    On retire les EXECUTE hérités de PUBLIC/anon/authenticated pour fermer
--    l'advisor anon_/authenticated_security_definer_function_executable sur
--    cette fonction.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

COMMENT ON FUNCTION public.is_org_member(uuid, text) IS
  'SECURITY DEFINER (owner postgres, BYPASS RLS interne). uid est toujours initplan_uid() (claim JWT signé). SECURITY INVOKER brise en récursion : EXISTS sur profiles/org_memberships/org_admins ré-invoque la policy RLS de chaque table qui appelle is_org_member (ERROR 54001 stack depth limit exceeded). Ce commentaire est le garde-fou : ne repasser en INVOKER sans revalider la récursion.';
