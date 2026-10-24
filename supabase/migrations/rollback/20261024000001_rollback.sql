-- ============================================================================
-- Rollback de 20261024000001 — backfill du double encodage jsonb
-- ----------------------------------------------------------------------------
-- Restaure EXACTEMENT les valeurs remplacées par la migration, depuis la table
-- de sauvegarde `_jsonb_backfill_20261024` créée par celle-ci. Aucune valeur
-- n'est devinée : seules les lignes effectivement modifiées sont restaurées,
-- ce qui laisse intactes les lignes déjà saines (les 147 `budget_items`
-- valides, par exemple).
--
-- Après restauration, la table de sauvegarde est supprimée.
-- ============================================================================

DO $do$
DECLARE
  rec record;
  n integer;
  total integer := 0;
BEGIN
  FOR rec IN SELECT DISTINCT table_name, column_name FROM public._jsonb_backfill_20261024
  LOOP
    EXECUTE format(
      'UPDATE public.%I t SET %I = b.old_value::jsonb
         FROM public._jsonb_backfill_20261024 b
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

DROP TABLE IF EXISTS public._jsonb_backfill_20261024;
