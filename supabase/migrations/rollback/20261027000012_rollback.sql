-- ============================================================================
-- Rollback de 20261027000012 — littéral jsonb "null" dans audit_entries
-- ----------------------------------------------------------------------------
-- Restaure EXACTEMENT les valeurs remplacées (la chaîne `"null"`), depuis la
-- table de sauvegarde `_jsonb_null_literal_20261027`. Aucune valeur n'est
-- devinée. Après restauration, la table de sauvegarde est supprimée.
-- ============================================================================

DO $do$
DECLARE
  rec record;
  n integer;
  total integer := 0;
BEGIN
  FOR rec IN SELECT DISTINCT table_name, column_name FROM public._jsonb_null_literal_20261027
  LOOP
    EXECUTE format(
      'UPDATE public.%I t SET %I = b.old_value::jsonb
         FROM public._jsonb_null_literal_20261027 b
        WHERE b.table_name = %L AND b.column_name = %L
          AND t.%I::text = b.row_id',
      rec.table_name, rec.column_name,
      rec.table_name, rec.column_name,
      'id'
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    RAISE NOTICE 'restaure % . % : % ligne(s)', rec.table_name, rec.column_name, n;
  END LOOP;
  RAISE NOTICE 'Total restaure : % ligne(s)', total;
END;
$do$;

DROP TABLE IF EXISTS public._jsonb_null_literal_20261027;
