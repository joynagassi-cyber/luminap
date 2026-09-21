-- ============================================================================
-- 20260921000003 — Helper is_org_member ÉTENDU (multi-org, Vague 1)
-- ----------------------------------------------------------------------------
-- ON NE RÉÉCRIT PAS LES POLICIES : on étend la SEULE fonction que les ~50
-- policies RLS référencent. C'est le pivot du multi-org gratuit : dès que
-- is_org_member voit le membership org_memberships, toutes les policies
-- existantes (transactions, members, events, …) passent en multi-org sans
-- être modifiées (invariant 3).
--
-- Formule d'union (le "∪" du socle multi-org) :
--   legacy profiles.org_id
--   ∪ org_memberships (ACTIVE | PENDING)
--   ∪ org_admins ACTIVE (admin central avec grant actif)
--
-- Idempotence / réversibilité : tant que le backfill 1:1 est exact,
-- `legacy ∪ memberships` = l'ancien jeu de données pour un user 1-org
-- (assert 1.6 du plan = point de bloquant).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_member(uid UUID, org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = uid AND p.org_id = org_id)
    OR EXISTS (SELECT 1 FROM public.org_memberships m
               WHERE m.user_id = uid AND m.org_id = org_id
                 AND m.status IN ('ACTIVE','PENDING'))
    OR EXISTS (SELECT 1 FROM public.org_admins a
               WHERE a.admin_profile_id = uid AND a.org_id = org_id
                 AND a.status = 'ACTIVE');
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, TEXT) TO authenticated;
