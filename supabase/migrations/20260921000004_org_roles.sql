-- ============================================================================
-- 20260921000004 — Helper org_roles() : liste des rôles actifs de l'user dans l'org
-- ----------------------------------------------------------------------------
-- Complément de `is_org_member` (migration 20260921000003) : retourne le
-- tableau des rôles ACTIFS de l'utilisateur dans l'organisation cible.
--
-- Usages :
--   * UI / capability : affichage des rôles multiples d'un user (multi-rôle
--     dans une même org) et tri par ROLE_HIERARCHY.
--   * canAccess (Vague 2, §2.4) : source n°4 de la formule d'union —
--     PERMISSION_MATRIX[r] pour chaque r ∈ org_roles(uid, orgId).
--
-- STATIQUE : on ne réécrit PAS les policies RLS, qui continuent de passer
-- par `is_org_member` (invariant 3). Ce helper est purement informatif pour
-- l'union de permissions ; il ne restreint jamais l'accès.
--
-- Le COALESCE retourne un tableau vide (pas NULL) pour les users sans
-- membership, afin que le JS côté client puisse itérer directement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.org_roles(uid UUID, org_id TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.org_roles(UUID, TEXT) TO authenticated;
