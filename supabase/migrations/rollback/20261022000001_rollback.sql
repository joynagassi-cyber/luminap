-- Retour arrière de 20261022000001_fix_is_org_member_param_shadowing.sql
--
-- ATTENTION : ce rollback RÉINTRODUIT la fuite cross-organisation
-- (is_org_member renvoie TRUE pour toute organisation dès que l'appelant
-- possède une ligne `profiles`). Il n'existe que pour satisfaire l'exigence
-- de réversibilité, et pour revenir à un état connu si le correctif
-- provoquait une régression plus grave. Préférer corriger en avant.

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

CREATE OR REPLACE FUNCTION public.org_roles(uid uuid, org_id text)
RETURNS text[]
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT m.role)
       FROM public.org_memberships m
      WHERE m.user_id = uid
        AND m.org_id = org_id
        AND m.status IN ('ACTIVE','PENDING')),
    ARRAY[]::TEXT[]
  );
$$;
