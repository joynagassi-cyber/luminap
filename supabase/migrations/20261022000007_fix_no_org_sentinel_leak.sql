-- ============================================================================
-- 20261022000007 — fix: le sentinelle `__no_org__` faisait fuiter les profils
-- ----------------------------------------------------------------------------
-- SUITE DE 20261022000006
--   En cessant de rattacher les nouveaux inscrits à `org-1`, ils se retrouvent
--   tous avec `profiles.org_id = '__no_org__'`. Or `is_org_member(uid, org)`
--   ne vérifie que l'égalité `p.org_id = org` : deux utilisateurs « sans
--   organisation » sont donc considérés membres de la MÊME organisation
--   fictive, et la policy `profiles_select` les laisse se lire entre eux.
--
-- PREUVE (compte neuf `audit-fix-<ts>@lumina.dev`) :
--     GET /rest/v1/profiles?select=email,role,org_id  ->  48 profils
--     dont « johndoe@gmail.com », « dunamisveraklos@gmail.com », …
--   La fuite `org-1` (59 profils) est fermée, mais une fuite équivalente
--   subsiste via le sentinelle.
--
-- CORRECTIF
--   `is_org_member` retourne FALSE quand l'organisation demandée est le
--   sentinelle « pas d'organisation » (`__no_org__`, `no-org`, vide/NULL).
--   Un sentinelle n'est PAS une organisation : il ne peut pas fonder une
--   appartenance. La lecture de son propre profil reste garantie par
--   `profiles_select` (`initplan_uid() = id`), indépendamment de `org_id`.
--
--   Effet de bord voulu : les écritures « orphelines » (org_id sentinelle)
--   ne sont plus acceptées par les policies qui s'appuient sur `is_org_member`
--   — c'est le comportement correct (cf. AppContext.tsx qui signalait déjà
--   ces écritures `__no_org__` comme un défaut).
--
-- RÉVERSIBILITÉ : rollback/20261022000007_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_member(uid uuid, org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    -- Un sentinelle « pas d'organisation » ne fonde aucune appartenance.
    CASE
      WHEN is_org_member.org_id IS NULL
        OR btrim(is_org_member.org_id) = ''
        OR is_org_member.org_id IN ('__no_org__', 'no-org')
      THEN false
      ELSE
        EXISTS (
          SELECT 1 FROM public.profiles p
           WHERE p.id = is_org_member.uid
             AND p.org_id = is_org_member.org_id
        )
        OR EXISTS (
          SELECT 1 FROM public.org_memberships m
           WHERE m.user_id = is_org_member.uid
             AND m.org_id = is_org_member.org_id
             AND m.status IN ('ACTIVE', 'PENDING')
        )
        OR EXISTS (
          SELECT 1 FROM public.org_admins a
           WHERE a.admin_profile_id = is_org_member.uid
             AND a.org_id = is_org_member.org_id
             AND a.status = 'ACTIVE'
        )
    END;
$function$;
