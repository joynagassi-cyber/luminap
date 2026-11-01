-- R89.a (re-application) — Restauration des catégories canoniques.
--
-- Contexte : le seed d'origine (20261026000006_seed_canonical_categories.sql)
-- est idempotent, mais ses 9 lignes ont été retirées de la base live
-- (mesure 2026-11-01 : `select count(*) from categories` = 0). Comme
-- `transactions.category_id` porte une FK vers `categories(id)`, TOUTE
-- écriture financière échoue alors en 23503
-- (« violates foreign key constraint transactions_category_id_fkey »),
-- y compris la file d'upload PowerSync (op jetée en FATAL, donnée jamais
-- synchronisée).
--
-- Cette migration RÉ-APPLIQUE le même seed, en toute idempotence
-- (ON CONFLICT DO NOTHING) : la rejouer sur une base déjà seedée est un
-- no-op. Les identifiants restent la source unique
-- (src/lib/canonicalCategories.ts), verrouillée par le test anti-dérive
-- canonical-categories-drift.test.ts.
--
-- NOTE : `categories.id` est une clé primaire GLOBALE (pas par
-- organisation) — ces 9 lignes suffisent à faire résoudre la FK pour
-- toutes les organisations.
INSERT INTO public.categories (id, key, label_fr, type, org_id) VALUES
  ('cat-dime',             'dime',                 'Dîme',                   'INCOME',  'org-1'),
  ('cat-offrande',         'offrande',             'Offrande',               'INCOME',  'org-1'),
  ('cat-offrande-mission', 'offrande_mission',     'Offrande Mission',       'INCOME',  'org-1'),
  ('cat-don',              'don',                  'Don',                    'INCOME',  'org-1'),
  ('cat-salaire-pasteur',  'salaire_pasteur',      'Salaire Pasteur',        'EXPENSE', 'org-1'),
  ('cat-frais-fonc',       'frais_fonctionnement', 'Frais de Fonctionnement','EXPENSE', 'org-1'),
  ('cat-mission',          'mission',              'Mission',                'EXPENSE', 'org-1'),
  ('cat-entretien',        'entretien',            'Entretien',              'EXPENSE', 'org-1'),
  ('cat-aumone',           'aumone',               'Aumône',                 'EXPENSE', 'org-1')
ON CONFLICT (id) DO NOTHING;
