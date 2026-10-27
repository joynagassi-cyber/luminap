# Receipt — Phase 8 : garde d'inventaire RLS (exécutable en CI, sans identifiants)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-08-rls-inventory-guard`
- **Exigence** : plan §5.1 — « Sécurité base : `get_advisors` sans alerte de
  niveau *erreur* ; **requête d'audit prouvant RLS + ≥1 politique par table
  exposée** ».

## Constat

Le seul contrôle de cet invariant était `scripts/rls-isolation-check.sh`, qui
**exige des identifiants Supabase** (`RLS_EMAIL_A`/`RLS_PASSWORD_A`) → non
exécutable en CI, donc non bloquant.

## Mesure (instance de DEV `hhgovvrnalibhgpakswi`)

Requête d'audit exécutée via MCP (`execute_sql`) :

```sql
with exposed as (
  select c.relname as table_name, c.relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
), pol as (
  select tablename, count(*) n from pg_policies where schemaname='public' group by 1
)
select json_agg(json_build_object('table', e.table_name, 'rls', e.rls,
       'policies', coalesce(p.n,0)) order by e.table_name)
from exposed e left join pol p on p.tablename = e.table_name;
```

**Résultat** : 43 tables. **Toutes** ont RLS activée. Une seule catégorie
d'exception : `keep_alive` et `_jsonb_backfill_20261024` (0 politique = deny-all
volontaire, déjà documenté R97 — faux positifs advisors).

## Livré

- `docs/agent/rls-inventory.json` — inventaire figé (43 tables : nom, RLS,
  nombre de politiques) + liste blanche deny-all.
- `src/lib/__tests__/rls-inventory.test.ts` — 4 tests : RLS sur toutes les
  tables ; ≥1 politique partout sauf deny-all ; deny-all minimal et documenté.
- Non-vacuité prouvée : injection d'une table `{rls:true, policies:0}` hors
  liste blanche → `GUARD_WOULD_FAIL: true`.

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (rls-inventory) | **4/4** |
| `npx tsc -b --noEmit` | **0** |
| `vitest run` (suite) | **1235/1235** (82 fichiers) |
| `eslint` | **0** erreur |

## Suite

Régénérer `rls-inventory.json` après tout changement de schéma/RLS (requête en
tête du test). Toute nouvelle table sans RLS ou sans politique fera **échouer**
la CI.
