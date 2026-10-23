-- 20261022000001 : corrige le masquage de paramètre dans is_org_member /
-- org_roles — fuite cross-organisation TOTALE des données.
--
-- Défaut (constaté en production le 2026-10-22) :
--   CREATE FUNCTION is_org_member(uid uuid, org_id text) ... AS $$
--     SELECT EXISTS (SELECT 1 FROM public.profiles p
--                     WHERE p.id = uid AND p.org_id = org_id)
--   $$
--
--   Dans une fonction SQL, un nom non qualifié qui correspond à la fois à un
--   paramètre ET à une colonne de la table en cours de lecture est résolu en
--   faveur de la COLONNE (règle de portée PostgreSQL : « le nom de colonne
--   masque le paramètre »). `p.org_id = org_id` se lit donc
--   `p.org_id = p.org_id` → toujours TRUE.
--
--   Conséquence : `is_org_member(initplan_uid(), '<n'importe quelle org>')`
--   renvoie TRUE dès que l'appelant possède une ligne dans `profiles`.
--   127 politiques RLS dépendent de cette fonction → tout utilisateur
--   authentifié lit (et écrit, via les policies INSERT/UPDATE/DELETE)
--   les données de TOUTES les organisations.
--
--   Preuve avant correctif (rôle authenticated, utilisateur de org-e2e) :
--     SELECT count(*) FROM public.profiles;   -- 108 (toutes orgs)
--     SELECT count(*) FROM public.organizations; -- 5 (toutes orgs)
--     SELECT public.is_org_member('<uid e2e>'::uuid,'org-1'); -- true (faux)
--
-- Correctif : qualifier chaque référence de paramètre par le nom de la
-- fonction (`is_org_member.uid`, `is_org_member.org_id`). C'est la méthode
-- documentée pour lever l'ambiguïté sans renommer les paramètres — un
-- renommage est interdit par CREATE OR REPLACE pour un paramètre d'entrée.
-- Le corps métier (3 sources d'appartenance) et la signature sont inchangés.
--
-- Retour arrière : supabase/migrations/rollback/20261022000001_rollback.sql

CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE p.id = is_org_member.uid
              AND p.org_id = is_org_member.org_id
         )
      OR EXISTS (
           SELECT 1 FROM public.org_memberships m
            WHERE m.user_id = is_org_member.uid
              AND m.org_id = is_org_member.org_id
              AND m.status IN ('ACTIVE','PENDING')
         )
      OR EXISTS (
           SELECT 1 FROM public.org_admins a
            WHERE a.admin_profile_id = is_org_member.uid
              AND a.org_id = is_org_member.org_id
              AND a.status = 'ACTIVE'
         );
$$;

-- org_roles souffre du même masquage : `m.org_id = org_id` → toujours vrai,
-- la fonction renvoyait les rôles de l'utilisateur pour TOUTES les orgs.
CREATE OR REPLACE FUNCTION public.org_roles(uid uuid, org_id text)
RETURNS text[]
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT m.role)
       FROM public.org_memberships m
      WHERE m.user_id = org_roles.uid
        AND m.org_id = org_roles.org_id
        AND m.status IN ('ACTIVE','PENDING')),
    ARRAY[]::TEXT[]
  );
$$;
