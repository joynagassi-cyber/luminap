-- ============================================================================
-- 20261026000001 — Phase 3 : garde anti-cycle de la fédération d'organisations
-- ----------------------------------------------------------------------------
-- DÉFAUT (réel, prouvé le 2026-10-26)
--   `organizations.parent_org_id` n'avait AUCUNE garde anti-cycle (ni trigger,
--   ni contrainte). Un re-parentage d'une organisation sous l'un de ses
--   descendants (ou sous elle-même) créait un cycle. Or `org_family`
--   (migration 20261003000003) et `org_descendants` (20261022000008) sont des
--   CTE `WITH RECURSIVE` : un cycle les fait boucler indéfiniment
--   (consommation CPU/RAM, requêtes bloquées).
--
-- PREUVE AVANT CORRECTIF
--   SELECT tgname FROM pg_trigger WHERE tgrelid='public.organizations'::regclass
--     AND NOT tgisinternal;  → seul trg_organizations_updated_at.
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid='public.organizations'::regclass;
--     → FK parent_org_id, PK, CHECK status, CHECK type. Aucune anti-cycle.
--
-- CORRECTIF (défense en profondeur)
--   Trigger BEFORE INSERT OR UPDATE OF parent_org_id : refuse si le nouveau
--   parent est l'organisation elle-même ou l'un de ses descendants. Le miroir
--   TS (`src/lib/orgTree.ts#wouldCreateCycle`, utilisé par
--   `federation.setParentOrg`) applique le même invariant côté client.
--
-- SÉMANTIQUE : la fonction ne fait que REFUSER une écriture invalide ; elle ne
-- modifie aucune donnée. Aucune suppression, aucune altération de ligne.
--
-- RÉVERSIBILITÉ : rollback/20261026000001_rollback.sql
-- ============================================================================

-- ── 1) Détecteur de cycle ───────────────────────────────────────────────────
--   Remonte la chaîne des parents depuis `p_parent` ; s'il croise `p_org`,
--   c'est un cycle. Boucle bornée (depth) pour terminer même si des données
--   corrompues cycliques existaient déjà.
CREATE OR REPLACE FUNCTION public.org_would_cycle(
  p_org text,
  p_parent text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  cur   text := p_parent;
  steps int  := 0;
BEGIN
  IF p_parent IS NULL THEN
    RETURN false;
  END IF;
  WHILE cur IS NOT NULL AND steps <= 1000 LOOP
    IF cur = p_org THEN
      RETURN true;
    END IF;
    SELECT o.parent_org_id INTO cur
      FROM public.organizations o
     WHERE o.id = cur;
    steps := steps + 1;
  END LOOP;
  RETURN false;
END;
$function$;

-- ── 2) Trigger : refus au niveau ligne ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.org_assert_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.parent_org_id IS NOT NULL
     AND public.org_would_cycle(NEW.id, NEW.parent_org_id) THEN
    RAISE EXCEPTION
      'Cycle de fédération refusé : % ne peut pas être rattachée à % (descendant).',
      NEW.id, NEW.parent_org_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_orgs_no_cycle ON public.organizations;
CREATE TRIGGER trg_orgs_no_cycle
  BEFORE INSERT OR UPDATE OF parent_org_id ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.org_assert_no_cycle();

COMMENT ON FUNCTION public.org_would_cycle(text, text) IS
  'Phase 3 — vrai si rattacher p_org sous p_parent créerait un cycle de fédération.';
COMMENT ON TRIGGER trg_orgs_no_cycle ON public.organizations IS
  'Phase 3 — refuse les cycles de fédération (org_family/org_descendants boucleraient sinon).';

-- ── 3) Réduction de surface ─────────────────────────────────────────────────
--   Ces fonctions ne servent qu'en interne (trigger). On retire EXECUTE à
--   PUBLIC/anon/authenticated : elles ne doivent pas être appelables via
--   PostgREST. Le trigger continue de fonctionner (il invoque la fonction
--   directement, sans passer par un GRANT au rôle appelant).
REVOKE ALL ON FUNCTION public.org_would_cycle(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.org_assert_no_cycle() FROM PUBLIC, anon, authenticated;
