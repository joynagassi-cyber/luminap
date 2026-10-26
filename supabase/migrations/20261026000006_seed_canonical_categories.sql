-- R89.a (CRITIQUE) — Seed des catégories canoniques.
--
-- Problème : le client écrit `transactions.category_id = 'cat-dime'` (et
-- autres identifiants littéraux, cf. src/lib/canonicalCategories.ts), mais le
-- serveur ne contenait que `cat-1 … cat-9`. `transactions_category_id_fkey`
-- référence `categories(id)` : chaque upload offline échouait donc en 23503
-- et AUCUNE donnée financière n'était synchronisée.
--
-- Ce seed est IDEMPOTENT (ON CONFLICT DO NOTHING) et aligne le serveur sur la
-- source unique des identifiants. Le test anti-dérive
-- (src/lib/__tests__/canonical-categories-drift.test.ts) échoue si ce fichier
-- et src/lib/canonicalCategories.ts divergent.
--
-- NOTE : `categories.id` est une clé primaire GLOBALE (pas par organisation).
-- Ces 9 lignes suffisent à faire résoudre la FK pour toutes les organisations.
-- Le correctif définitif (identifiants par organisation) est proposé à part.

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
