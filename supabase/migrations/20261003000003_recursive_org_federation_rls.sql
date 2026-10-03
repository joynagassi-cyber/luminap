-- ============================================================================
-- 20261003000003 — RLS récursif : vue `org_family` + policy de fédération
--                illimitée (profondeur illimitée)
-- ----------------------------------------------------------------------------
-- Feature « Rapports inter-organisations » (plan
-- docs/plans/2026-10-03-lumina-rapports-organisations.md, Phase 1 T1.2).
--
-- Frein existant : la policy `orgs_select_federation` (migration
-- 20260910000004) ne couvre que la profondeur 2 (l'org + sa mère + ses
-- enfants directs). Pour l'hiérarchie ILLIMITÉE (une annexe peut créer des
-- annexes qui créent des annexes…), on ajoute :
--   * une vue `org_family` = closure transitive récursive (CTE
--     `WITH RECURSIVE`) de la famille organisationnelle (tous les
--     ascendants + descendants, profondeur illimitée).
--   * une policy `orgs_select_federation_recursive` qui autorise la lecture
--     de TOUTE la famille (pas seulement profondeur 2), restreinte à
--     l'org courante de l'appelant (`profiles.org_id`).
--
-- La view est ADDITIVE (ne modifie PAS la table `organizations` legacy ;
-- pas de `DROP`/`ALTER` sur les tables legacy). La policy s'ajoute à côté
-- des policies existantes (`orgs_select_merged`, `orgs_insert_merged`,
-- `orgs_update_merged`) — pas de DROP des policies existantes.
--
-- Accès : `public.org_family` est une vue (lecture seule via la policy
-- d'orgs) ; la policy `FOR SELECT` sur `organizations` fait remonter la
-- lecture de la famille. `FORCE ROW LEVEL SECURITY` est déjà posé sur
-- `organizations` par la migration 20260910000002 ; on ne le répète pas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Vue closure transitive (profondeur illimitée)
--    `ancestor` = org racine de la famille (l'ascendant direct ou indirect)
--    `org_id`   = org descendante (elle-même, depth = 0)
--    Chaque org apparaît comme `ancestor` de soi-même (depth 0) → l'union
--    complète couvre la famille entière (ascendants + descendants + soi).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.org_family AS
WITH RECURSIVE fam AS (
  SELECT id AS org_id, id AS ancestor, 0 AS depth FROM public.organizations
  UNION ALL
  SELECT o.id, f.ancestor, f.depth + 1
  FROM public.organizations o
  JOIN fam f ON o.parent_org_id = f.org_id
)
SELECT ancestor, org_id FROM fam;

-- ----------------------------------------------------------------------------
-- 2) Policy SELECT récursive : voir sa famille complète
--    (soi + tous les ascendants + tous les descendants).
--    Rationale : une org annexe doit pouvoir lire les orgs de sa famille
--    (pour recevoir les rapports de ses annexes + envoyer à sa mère) ;
--    l'accès est restreint à la famille de l'appelant (pas de fuite
--    cross-famille). Ne modifie PAS les policies existantes (back-compat).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS orgs_select_federation_recursive ON public.organizations;
CREATE POLICY orgs_select_federation_recursive ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM public.org_family
      WHERE ancestor = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
    OR id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );
