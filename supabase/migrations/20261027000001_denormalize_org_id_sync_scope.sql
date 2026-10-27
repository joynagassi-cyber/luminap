-- ============================================================================
-- 20261027000001 — Dénormalisation `org_id` sur les tables enfants synchronisées
-- ----------------------------------------------------------------------------
-- DÉFAUT (R89.b, impact 5 — « les données ne descendent jamais sur un appareil »)
--   Les streams PowerSync `group_memberships`, `event_budgets`, `budget_lines`
--   et `custom_field_values` filtraient par jointure sur le parent :
--       SELECT child.* FROM child JOIN parent ON ... WHERE parent.org_id IN (...)
--   PowerSync ne peut pas clé la partition sur une colonne absente de la ligne
--   synchronisée : il clé alors sur la clé de la ligne jointe (group_id,
--   event_id, event_budget_id, custom_field_definition_id) → UN BUCKET PAR
--   LIGNE ENFANT, et surtout une requête de paramètre par ligne.
--   Résultat mesuré (token PowerSync réel, org de test à 6709 événements) :
--       PSYNC_S2305 « Too many parameter query results (limit of 1000) »
--   → la synchronisation échoue, `connected=false`, aucune donnée ne descend.
--   (Réfute l'hypothèse initiale « profiles > 1000 lignes » : la cause est le
--    nombre de lignes ENFANT, pas de profils.)
--
-- CORRECTIF (recommandation officielle PowerSync « Denormalizing the Scope Key »)
--   Porter `org_id` sur chaque table enfant, le maintenir cohérent par trigger,
--   et clé la partition sur `org_id` (comme toutes les autres tables) → 1 bucket
--   par organisation, plus une seule ligne de paramètre par organisation.
--
-- RÉVERSIBILITÉ : rollback/20261027000001_rollback.sql
-- ============================================================================

-- --- 1. Colonnes -------------------------------------------------------------
ALTER TABLE public.group_memberships  ADD COLUMN IF NOT EXISTS org_id text;
ALTER TABLE public.event_budgets      ADD COLUMN IF NOT EXISTS org_id text;
ALTER TABLE public.budget_lines       ADD COLUMN IF NOT EXISTS org_id text;
ALTER TABLE public.custom_field_values ADD COLUMN IF NOT EXISTS org_id text;

-- --- 2. Backfill depuis le parent -------------------------------------------
UPDATE public.group_memberships gm
   SET org_id = g.org_id
  FROM public.groups g
 WHERE gm.group_id = g.id AND gm.org_id IS DISTINCT FROM g.org_id;

UPDATE public.event_budgets eb
   SET org_id = e.org_id
  FROM public.events e
 WHERE eb.event_id = e.id AND eb.org_id IS DISTINCT FROM e.org_id;

UPDATE public.budget_lines bl
   SET org_id = eb.org_id
  FROM public.event_budgets eb
 WHERE bl.event_budget_id = eb.id AND bl.org_id IS DISTINCT FROM eb.org_id;

UPDATE public.custom_field_values cfv
   SET org_id = cfd.org_id
  FROM public.custom_field_definitions cfd
 WHERE cfv.custom_field_definition_id = cfd.id
   AND cfv.org_id IS DISTINCT FROM cfd.org_id;

-- --- 3. Garde-fou : aucune ligne ne doit rester sans org_id ------------------
DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT (SELECT count(*) FROM public.group_memberships  WHERE org_id IS NULL)
       + (SELECT count(*) FROM public.event_budgets      WHERE org_id IS NULL)
       + (SELECT count(*) FROM public.budget_lines       WHERE org_id IS NULL)
       + (SELECT count(*) FROM public.custom_field_values WHERE org_id IS NULL)
    INTO v_missing;
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'R89.b : % ligne(s) enfant sans org_id après backfill', v_missing;
  END IF;
END $$;

ALTER TABLE public.group_memberships   ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.event_budgets       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.budget_lines        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.custom_field_values ALTER COLUMN org_id SET NOT NULL;

-- --- 4. Index (le filtre de stream porte sur org_id) ------------------------
CREATE INDEX IF NOT EXISTS idx_group_memberships_org_id   ON public.group_memberships (org_id);
CREATE INDEX IF NOT EXISTS idx_event_budgets_org_id       ON public.event_budgets (org_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_org_id        ON public.budget_lines (org_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_org_id ON public.custom_field_values (org_id);

-- --- 5. Cohérence : trigger BEFORE sur l'enfant (pose org_id depuis le parent)
--     Générique : TG_ARGV = [table_parent, colonne_fk].
CREATE OR REPLACE FUNCTION public.denorm_child_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_parent text := TG_ARGV[0];
  v_fk     text := TG_ARGV[1];
  v_fkval  text;
BEGIN
  v_fkval := to_jsonb(NEW) ->> v_fk;
  EXECUTE format('SELECT org_id FROM public.%I WHERE id = $1', v_parent)
    INTO NEW.org_id USING v_fkval;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_group_memberships_denorm_org ON public.group_memberships;
CREATE TRIGGER trg_group_memberships_denorm_org
  BEFORE INSERT OR UPDATE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION public.denorm_child_org_id('groups', 'group_id');

DROP TRIGGER IF EXISTS trg_event_budgets_denorm_org ON public.event_budgets;
CREATE TRIGGER trg_event_budgets_denorm_org
  BEFORE INSERT OR UPDATE ON public.event_budgets
  FOR EACH ROW EXECUTE FUNCTION public.denorm_child_org_id('events', 'event_id');

DROP TRIGGER IF EXISTS trg_budget_lines_denorm_org ON public.budget_lines;
CREATE TRIGGER trg_budget_lines_denorm_org
  BEFORE INSERT OR UPDATE ON public.budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.denorm_child_org_id('event_budgets', 'event_budget_id');

DROP TRIGGER IF EXISTS trg_custom_field_values_denorm_org ON public.custom_field_values;
CREATE TRIGGER trg_custom_field_values_denorm_org
  BEFORE INSERT OR UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.denorm_child_org_id('custom_field_definitions', 'custom_field_definition_id');

-- --- 6. Cohérence : cascade si le parent change d'organisation --------------
--     Générique : TG_ARGV = [table_enfant, colonne_fk].
CREATE OR REPLACE FUNCTION public.denorm_cascade_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_child text := TG_ARGV[0];
  v_fk    text := TG_ARGV[1];
BEGIN
  EXECUTE format('UPDATE public.%I SET org_id = $1 WHERE %I = $2', v_child, v_fk)
    USING NEW.org_id, NEW.id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_groups_cascade_org ON public.groups;
CREATE TRIGGER trg_groups_cascade_org
  AFTER UPDATE OF org_id ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.denorm_cascade_org_id('group_memberships', 'group_id');

DROP TRIGGER IF EXISTS trg_events_cascade_org ON public.events;
CREATE TRIGGER trg_events_cascade_org
  AFTER UPDATE OF org_id ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.denorm_cascade_org_id('event_budgets', 'event_id');

DROP TRIGGER IF EXISTS trg_event_budgets_cascade_org ON public.event_budgets;
CREATE TRIGGER trg_event_budgets_cascade_org
  AFTER UPDATE OF org_id ON public.event_budgets
  FOR EACH ROW EXECUTE FUNCTION public.denorm_cascade_org_id('budget_lines', 'event_budget_id');

DROP TRIGGER IF EXISTS trg_custom_field_definitions_cascade_org ON public.custom_field_definitions;
CREATE TRIGGER trg_custom_field_definitions_cascade_org
  AFTER UPDATE OF org_id ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.denorm_cascade_org_id('custom_field_values', 'custom_field_definition_id');
