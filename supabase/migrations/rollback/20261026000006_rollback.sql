-- Rollback de 20261026000006_seed_canonical_categories.sql
--
-- Supprime les 9 catégories canoniques seedées. ATTENTION : toute ligne de
-- `transactions` / `budget_lines` / `org_budget_lines` qui référence encore
-- l'un de ces identifiants empêcherait la suppression (FK). Le rollback est
-- donc refusé tant que des références subsistent — on ne casse pas la FK.

DO $$
DECLARE
  refs bigint;
BEGIN
  SELECT count(*) INTO refs
  FROM public.transactions
  WHERE category_id IN ('cat-dime','cat-offrande','cat-offrande-mission',
                        'cat-don','cat-salaire-pasteur','cat-frais-fonc',
                        'cat-mission','cat-entretien','cat-aumone');

  IF refs > 0 THEN
    RAISE EXCEPTION
      'Rollback refusé : % transaction(s) référencent encore une catégorie canonique',
      refs;
  END IF;
END $$;

DELETE FROM public.categories
WHERE id IN ('cat-dime','cat-offrande','cat-offrande-mission','cat-don',
             'cat-salaire-pasteur','cat-frais-fonc','cat-mission',
             'cat-entretien','cat-aumone');
