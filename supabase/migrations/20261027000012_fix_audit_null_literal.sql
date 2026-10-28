-- ============================================================================
-- 20261027000012 — fix(data): littéral jsonb "null" dans audit_entries
-- ----------------------------------------------------------------------------
-- DÉFAUT (R65, instance non couverte par la migration 20261024000001)
--   `src/lib/audit.ts#write` sérialisait `JSON.stringify(beforeState)`. Pour un
--   CREATE, `beforeState` vaut `null` → `JSON.stringify(null)` = la CHAÎNE
--   `"null"`, stockée en jsonb de type `string` au lieu de `NULL`.
--
--   La migration 20261024000001 convertissait déjà ce cas (`before_state =
--   'null'::jsonb`) mais affirmait « plus aucune écriture ne peut produire ce
--   format » — FAUX : `audit.ts` n'avait pas été corrigé, et 88 nouvelles
--   lignes ont été écrites APRÈS la migration.
--
-- MESURE AVANT (base `hhgovvrnalibhgpakswi`, 2026-10-27)
--   audit_entries.before_state : 88 lignes jsonb_typeof='string', toutes = "null"
--   audit_entries.after_state  :  0
--   Répartition : 84 `Invitation` + 4 `FormSubmission`, toutes action='CREATE',
--   du 2026-10-24 au 2026-10-27.
--
-- CORRECTIF AMONT (code, livré avec cette migration)
--   `src/lib/audit.ts` : `serializeAuditState(state)` renvoie `null` (→ NULL)
--   pour une valeur absente, et la chaîne JSON sinon. Verrouillé par un test.
--
-- CETTE MIGRATION (rattrapage de données, aucun changement de schéma)
--   1. Sauvegarde EXACTE des valeurs remplacées dans
--      `_jsonb_null_literal_20261027` — c'est ce qui rend le rollback exact.
--   2. Remplace une valeur jsonb `string` valant littéralement `"null"` par
--      `NULL` (état absent = NULL, forme canonique attendue).
--   3. Idempotente : rejouable, la 2e exécution ne trouve plus rien.
--
-- RÉVERSIBILITÉ : rollback/20261027000012_rollback.sql (restaure depuis la
--   table de sauvegarde, puis la supprime).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._jsonb_null_literal_20261027 (
  table_name text NOT NULL,
  column_name text NOT NULL,
  row_id text NOT NULL,
  old_value text,
  PRIMARY KEY (table_name, column_name, row_id)
);

DO $do$
DECLARE
  target record;
  n integer;
  total integer := 0;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('audit_entries', 'before_state', 'id'),
      ('audit_entries', 'after_state',  'id')
    ) AS t(table_name, column_name, id_col)
  LOOP
    -- 1) Sauvegarde exacte de ce qui va être remplacé.
    EXECUTE format(
      'INSERT INTO public._jsonb_null_literal_20261027 (table_name, column_name, row_id, old_value)
       SELECT %L, %L, %I::text, %I::text
         FROM public.%I
        WHERE jsonb_typeof(%I) = ''string''
          AND (%I #>> ''{}'') = ''null''
       ON CONFLICT (table_name, column_name, row_id) DO NOTHING',
      target.table_name, target.column_name, target.id_col, target.column_name,
      target.table_name, target.column_name, target.column_name
    );

    -- 2) Conversion : `"null"` (string) -> NULL (état absent).
    EXECUTE format(
      'UPDATE public.%I SET %I = NULL
        WHERE jsonb_typeof(%I) = ''string''
          AND (%I #>> ''{}'') = ''null''',
      target.table_name, target.column_name,
      target.column_name, target.column_name
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    RAISE NOTICE '% . % : % ligne(s) convertie(s)', target.table_name, target.column_name, n;
  END LOOP;
  RAISE NOTICE 'Total converti : % ligne(s)', total;
END;
$do$;
