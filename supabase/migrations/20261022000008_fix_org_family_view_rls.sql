-- ============================================================================
-- 20261022000008 — fix: la vue `org_family` contournait la RLS (fuite inter-orgs)
-- ----------------------------------------------------------------------------
-- DÉFAUT (CRITIQUE)
--   `public.org_family` est une vue créée en 20261003000003 pour calculer la
--   clôture transitive de la fédération d'organisations. Elle n'avait PAS
--   `security_invoker`, donc elle s'exécutait avec les droits de son
--   propriétaire (`postgres`) et **ignorait la RLS de `organizations`**.
--
--   Conséquence : n'importe qui — y compris un visiteur NON authentifié (`anon`)
--   ou un simple membre d'une organisation — pouvait énumérer TOUTES les
--   organisations de la base, et lire les `organizations` de la fédération
--   d'autrui via la policy `orgs_select_federation_recursive`.
--
-- PREUVE
--   Sans jeton (clé anon seule) :
--     GET /rest/v1/org_family -> [{"ancestor":"org-central",...},{"ancestor":"org-1",...},
--                                 {"ancestor":"e2e-auth-org-1",...},{"ancestor":"org-e2e",...},
--                                 {"ancestor":"org-e2e-unconf",...}]
--   Membre de `org-e2e` : GET /rest/v1/org_family -> 5 lignes (5 organisations).
--   Après correctif : anon -> 0 ligne ; membre -> 1 ligne (la sienne).
--
-- CORRECTIF
--   `security_invoker = true` sur la vue fait évaluer la RLS de `organizations`
--   sous l'identité de l'appelant. Mais la policy `orgs_select_federation_recursive`
--   lisait elle-même `org_family` → récursion infinie
--   (« infinite recursion detected in policy for relation organizations »).
--
--   La policy est donc réécrite pour s'appuyer sur une fonction SECURITY DEFINER
--   `org_descendants(uid)` qui calcule les descendants de l'organisation de
--   l'appelant uniquement. La sémantique voulue (un membre voit sa fédération
--   descendante) est préservée, sans récursion.
--
--   `org_federation` portait déjà `security_invoker=true` (aucune fuite).
--
-- RÉVERSIBILITÉ : rollback/20261022000008_rollback.sql
-- ============================================================================

-- ── 1) Helper : descendants de l'organisation de l'appelant ─────────────────
CREATE OR REPLACE FUNCTION public.org_descendants(p_uid uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH RECURSIVE fam AS (
    SELECT o.id FROM public.organizations o
     WHERE o.id = (SELECT p.org_id FROM public.profiles p WHERE p.id = p_uid)
    UNION ALL
    SELECT c.id FROM public.organizations c JOIN fam f ON c.parent_org_id = f.id
  )
  SELECT id FROM fam;
$function$;

-- ── 2) Policy de fédération : plus de lecture directe de la vue ─────────────
DROP POLICY IF EXISTS orgs_select_federation_recursive ON public.organizations;
CREATE POLICY orgs_select_federation_recursive ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.org_descendants(initplan_uid())));

-- ── 3) La vue n'échappe plus à la RLS ───────────────────────────────────────
ALTER VIEW public.org_family SET (security_invoker = true);
