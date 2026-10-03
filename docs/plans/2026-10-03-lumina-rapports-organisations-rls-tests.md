# Vérification manuelle RLS `org_reports` — Feature 2 Phase 5

> **Date** : 2026-10-03
> **Périmètre** : Table `public.org_reports` + policies `org_reports_emitter` / `org_reports_receiver` + helper `current_org_id()` (migration `20261003000002`).
>
> **Outil** : Supabase MCP `supabase-lumina` → `execute_sql`
>
> **Contexte** : Les 4 checks ci-dessous simulent le contexte JWT des users via `SET ROLE authenticated` + `SET request.jwt.claims`. Les requêtes doivent être exécutées séquentiellement (chaque `SET` modifie la session Postgres).

---

## Pré-requis — Setup de la donnée de test

```sql
-- Créer 2 orgs test (mère + enfant) si elles n'existent pas déjà
-- 2 users test (u-mère, u-enfant) dans profiles/org_memberships

INSERT INTO public.organizations (id, name, parent_org_id, created_by, created_at, updated_at)
VALUES
  ('org-mère-test', 'Mère Test', NULL, 'u-admin-test', now(), now()),
  ('org-enfant-test', 'Enfant Test', 'org-mère-test', 'u-admin-test', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, org_id) VALUES
  ('u-mère-test', 'org-mère-test'),
  ('u-enfant-test', 'org-enfant-test')
ON CONFLICT (id) DO NOTHING;

-- 1 rapport émis par l'enfant vers la mère
INSERT INTO public.org_reports
  (id, from_org_id, to_org_id, period_start, period_end, format,
   title, content, status, created_by, created_at, updated_at)
VALUES
  ('rpt-test-001', 'org-enfant-test', 'org-mère-test',
   '2026-01-01', '2026-12-31', 'pdf',
   'Rapport Annuel 2026', '{"totalIncome":0}', 'PENDING',
   'u-enfant-test', now(), now())
ON CONFLICT (from_org_id, to_org_id, period_start, period_end, format) DO NOTHING;

-- 2e rapport NON destiné à u-mère (de l'extérieur) pour tester le rejet
INSERT INTO public.org_reports
  (id, from_org_id, to_org_id, period_start, period_end, format,
   title, content, status, created_by, created_at, updated_at)
VALUES
  ('rpt-test-002', 'org-externe', 'org-mère-test',
   '2026-01-01', '2026-12-31', 'pdf',
   'Rapport externe', '{}', 'PENDING',
   'u-extérieur', now(), now())
ON CONFLICT (from_org_id, to_org_id, period_start, period_end, format) DO NOTHING;
```

> ⚠️ Ces inserts doivent être exécutés **en dehors** du rôle `authenticated` (ex. `service_role` via `SET ROLE service_role` + reset, ou directement via l'admin) pour contourner le RLS.

---

## Check 1 — Le récepteur (u-mère) voit le rapport `to_org_id = mère`

**Requête SQL** :
```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"u-mère-test","org_id":"org-mère-test"}';
SELECT count(*) AS visible_rows FROM public.org_reports;
```

**État attendu** : `visible_rows = 2` (les 2 inserts ci-dessus sont tous deux destinés à `org-mère-test`).

**Requête complémentaire (vérification RLS)** :
```sql
SELECT count(*) AS visible_rows
FROM public.org_reports
WHERE to_org_id = public.current_org_id();
```

**État attendu** : `visible_rows = 2`.

**Requête de contrôle (verifier que l'INSERT est bloqué)** :
```sql
INSERT INTO public.org_reports
  (id, from_org_id, to_org_id, period_start, period_end, format, title, content, status)
VALUES
  ('rpt-insert-test', 'org-mère-test', 'org-mère-test',
   '2026-01-01', '2026-12-31', 'pdf', 'X', '{}', 'PENDING');
```

**État attendu** : erreur (RLS `org_reports_emitter` = `from_org_id = current_org_id()` → `u-mère-test` ne peut pas insérer un rapport de `org-mère-test` qui n'existe pas comme `from_org`).

> Si l'org `org-mère-test` n'est pas déclarée comme `from_org` dans le système, l'INSERT devrait **échouer**. En pratique, les deux orgs test sont déclarées dans `organizations`, donc `current_org_id()` = `org-mère-test` pour `u-mère-test`. L'INSERT devrait réussir car `from_org_id = current_org_id()` = `org-mère-test`. C'est un faux négatif de setup — **le vrai test de rejet est le Check 4 ci-dessous.**

---

## Check 2 — L'émetteur (u-enfant) peut modifier son propre rapport

**Requête SQL** :
```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"u-enfant-test","org_id":"org-enfant-test"}';

-- L'UPDATE est autorisé par org_reports_emitter (FOR ALL, from_org_id = current_org_id())
UPDATE public.org_reports
SET status = 'SENT', updated_at = now()
WHERE id = 'rpt-test-001' AND from_org_id = public.current_org_id();

SELECT count(*) AS updated FROM public.org_reports WHERE id = 'rpt-test-001' AND status = 'SENT';
```

**État attendu** : `updated = 1`.

---

## Check 3 — L'émetteur (u-enfant) NE peut PAS lire les rapports qu'il n'a pas émis

**Requête SQL** :
```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"u-enfant-test","org_id":"org-enfant-test"}';

SELECT count(*) AS visible_rows FROM public.org_reports;
```

**État attendu** : `visible_rows = 1` (seulement `rpt-test-001` car `from_org_id = org-enfant-test`). `rpt-test-002` (`from_org_id = org-externe`) **est invisible** car RLS `org_reports_emitter` + `org_reports_receiver` s'appliquent à `to_org_id = current_org_id()` = `org-enfant-test` ≠ `org-mère-test`.

**Vérification directe** :
```sql
SELECT count(*) AS hidden_rows
FROM public.org_reports
WHERE id = 'rpt-test-002';
```

**État attendu** : `hidden_rows = 0` (la ligne existe physiquement mais est masquée par RLS pour `u-enfant-test`).

---

## Check 4 — Un user D'HORS FAMILLE ne voit rien

**Setup du user externe** :
```sql
-- Créer un user + profile hors de la famille mère/enfant
INSERT INTO public.profiles (id, org_id) VALUES
  ('u-extérieur-test', 'org-extérieur')
ON CONFLICT (id) DO NOTHING;
```

**Requête SQL** :
```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"u-extérieur-test","org_id":"org-extérieur"}';

SELECT count(*) AS visible_rows FROM public.org_reports;
```

**État attendu** : `visible_rows = 0`.

**Explication** : `current_org_id()` = `org-extérieur`. `org_reports_emitter` : `from_org_id = org-extérieur` → aucune ligne (les 2 inserts sont depuis `org-enfant-test` et `org-extérieur`). `org_reports_receiver` : `to_org_id = org-extérieur` → aucune ligne. RLS FORCE = `0` lignes visibles.

---

## Check 5 (bonus) — Vérifier le helper `current_org_id()`

```sql
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"u-mère-test","org_id":"org-mère-test"}';
SELECT public.current_org_id() AS org;
```

**État attendu** : `org = 'org-mère-test'`.

Si le helper renvoie `NULL` → la policy RLS bloque TOUT (pas d'accès) car `USING (NULL = ...)` = `FALSE`.

---

## Résultat attendu consolidé

| Check | Requête | Ligne attendue |
|---|---|---|
| 1 | `u-mère` : `SELECT * FROM org_reports` | 2 lignes |
| 2 | `u-enfant` : `UPDATE ... WHERE id='rpt-test-001' AND from_org_id=current_org_id()` | 1 ligne modifiée |
| 3 | `u-enfant` : `SELECT * FROM org_reports` | 1 ligne |
| 3b | `u-enfant` : `SELECT count(*) FROM org_reports WHERE id='rpt-test-002'` | 0 ligne |
| 4 | `u-extérieur` : `SELECT * FROM org_reports` | 0 ligne |
| 5 | `u-mère` : `SELECT public.current_org_id()` | `'org-mère-test'` |

---

## Script d'automatisation

Voir `scripts/rls-verify.sh` (à lancer après le setup des orgs test via `execute_sql` en `service_role`). Le script exécute les 5 checks et compare le résultat.

> **Note** : le script bash n'est **pas** un test vitest — il s'appuie sur le live Supabase MCP et le contexte de session. À exécuter uniquement dans un environnement où le Supabase MCP `supabase-lumina` est connecté.
