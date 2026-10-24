-- ============================================================================
-- 20261024000001 — fix(data): rattrapage du double encodage jsonb
-- ----------------------------------------------------------------------------
-- DÉFAUT
--   Le client sérialisait (`JSON.stringify`) les colonnes `jsonb` avant de les
--   écrire dans l'outbox PowerSync, où elles sont déclarées en `text`. PostgREST
--   recevait donc une *chaîne* JSON et l'insérait telle quelle dans une colonne
--   `jsonb` : la valeur stockée est de type `string` (`"\"[]\""`) au lieu de
--   `array`/`object`.
--
--   À la relecture, `JSON.parse` renvoie une chaîne et le premier `.map()` /
--   `.reduce()` de l'UI lève (`form.fields.map is not a function`) : tout
--   l'écran tombe sur l'error boundary. Défaut silencieux — aucune erreur à
--   l'écriture, seulement au rendu.
--
-- MESURE AVANT (base `hhgovvrnalibhgpakswi`, 2026-10-24)
--   events.budget_items            158 string / 147 array
--   form_definitions.fields         34 string /   0 array
--   invitations.grants_payload       8 string /   2 array
--   invitations.tags_payload         8 string /   2 array
--   audit_entries.after_state        5 string /  10 object
--   audit_entries.before_state       5 string /   3 object  (tous = "null")
--   → 218 valeurs corrompues : 213 re-parsables en conteneur + 5 = `"null"`.
--     0 échec de re-parse (vérifié avant écriture).
--
-- CORRECTIF AMONT (code, déjà appliqué)
--   `src/lib/jsonb.ts` + `SupabaseConnector.uploadData` normalisent la valeur à
--   l'upload ; `parseJsonbValue` tolère les deux formes à la lecture. Plus
--   aucune écriture ne peut produire ce format.
--
-- CETTE MIGRATION (rattrapage de données, aucun changement de schéma)
--   1. Sauvegarde EXACTE des valeurs remplacées dans
--      `_jsonb_backfill_20261024` — c'est ce qui rend le rollback exact.
--   2. Convertit une valeur `string` dont le contenu est un conteneur JSON
--      (`[`/`{`) en sa forme structurée. Les scalaires légitimes
--      (`custom_field_values.value` = "Bonjour") ne sont pas touchés.
--   3. Idempotente : rejouable, la 2e exécution ne trouve plus rien à faire.
--
-- RÉVERSIBILITÉ : rollback/20261024000001_rollback.sql (restaure depuis la
--   table de sauvegarde, puis la supprime).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._jsonb_backfill_20261024 (
  table_name text NOT NULL,
  column_name text NOT NULL,
  row_id text NOT NULL,
  old_value text,
  PRIMARY KEY (table_name, column_name, row_id)
);

-- Parse « best effort » : renvoie NULL au lieu de lever sur une valeur non-JSON.
CREATE OR REPLACE FUNCTION public.agent_try_jsonb(t text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RETURN t::jsonb;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$fn$;

DO $do$
DECLARE
  target record;
  n integer;
  total integer := 0;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('events',            'budget_items',   'id'),
      ('form_definitions',  'fields',         'id'),
      ('invitations',       'grants_payload', 'id'),
      ('invitations',       'tags_payload',   'id'),
      ('audit_entries',     'before_state',   'id'),
      ('audit_entries',     'after_state',    'id'),
      ('form_submissions',  'data',           'id'),
      ('org_reports',       'content',        'id'),
      ('report_definitions','filters',        'id')
    ) AS t(table_name, column_name, id_col)
  LOOP
    -- 1) Sauvegarde exacte de ce qui va être remplacé.
    EXECUTE format(
      'INSERT INTO public._jsonb_backfill_20261024 (table_name, column_name, row_id, old_value)
       SELECT %L, %L, %I::text, %I::text
         FROM public.%I
        WHERE jsonb_typeof(%I) = ''string''
          AND (%I #>> ''{}'') ~ ''^\s*[\[{]''
          AND public.agent_try_jsonb(%I #>> ''{}'') IS NOT NULL
       ON CONFLICT (table_name, column_name, row_id) DO NOTHING',
      target.table_name, target.column_name, target.id_col, target.column_name,
      target.table_name, target.column_name, target.column_name, target.column_name
    );

    -- 2) Conversion.
    EXECUTE format(
      'UPDATE public.%I SET %I = public.agent_try_jsonb(%I #>> ''{}'')
        WHERE jsonb_typeof(%I) = ''string''
          AND (%I #>> ''{}'') ~ ''^\s*[\[{]''
          AND public.agent_try_jsonb(%I #>> ''{}'') IS NOT NULL',
      target.table_name, target.column_name, target.column_name,
      target.column_name, target.column_name, target.column_name
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    RAISE NOTICE '% . % : % ligne(s) convertie(s)', target.table_name, target.column_name, n;
  END LOOP;
  RAISE NOTICE 'Total converti : % ligne(s)', total;
END;
$do$;

-- Cas particulier : `before_state` = chaîne "null" -> forme structurée JSON null.
UPDATE public.audit_entries SET before_state = 'null'::jsonb
 WHERE jsonb_typeof(before_state) = 'string' AND (before_state #>> '{}') = 'null';

DROP FUNCTION public.agent_try_jsonb(text);
