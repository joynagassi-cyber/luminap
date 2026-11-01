# Receipt — Index couvrants des FK (`event_tasks`) + clôture des advisors performance

- **Date** : 2026-10-31
- **Branche** : `agent/r140-audit-append-only`
- **Migration** : `20261031000005_fk_covering_indexes.sql` (+ rollback)

## Défaut mesuré (advisor `unindexed_foreign_keys`, lint 0001)

L'advisor performance signalait **2 clés étrangères sans index couvrant** :

| Table | FK | Colonne |
|---|---|---|
| `event_tasks` | `event_tasks_event_id_fkey` | `event_id` |
| `event_tasks` | `event_tasks_parent_task_id_fkey` | `parent_task_id` |

**Cause racine** : les index existants sont **composites** et mènent par
`org_id` (`event_tasks_org_event_idx (org_id, event_id)`,
`event_tasks_org_parent_idx (org_id, parent_task_id)`). Un index composite ne
peut **pas** servir une recherche sur la seule colonne de FK (préfixe `org_id`
absent). Or la contrainte FK est vérifiée par `WHERE event_id = …` /
`WHERE parent_task_id = …` (DELETE/UPDATE sur `events` / `event_tasks`).

## Correctif (additif, réversible)

Deux index mono-colonne : `event_tasks_event_id_idx`, `event_tasks_parent_task_id_idx`.
Aucune donnée modifiée. Les index composites existants sont conservés.

## Preuve

- `supabase_get_advisors(performance)` **après** : le lint
  `unindexed_foreign_keys` a **disparu** (il ne reste que `unused_index` et
  `multiple_permissive_policies`, cf. ci-dessous).
- Les 2 nouveaux index apparaissent en `unused_index` — **attendu** sur une base
  de dev sans trafic (mesure sur fenêtre sans requête).

## Advisors restants (revus, non actionnables / faux positifs)

- `unused_index` (48) — base de dev sans trafic ; un index « inutilisé » peut
  être critique en production. **Ne pas supprimer** (destructif, non mesurable).
- `multiple_permissive_policies` (7) — `org_reports` (émetteur+récepteur
  SELECT) et `organizations` (fédération+merged). Redondance **permissive**
  (coût minime), aucune faille. Fusion = changement de politique RLS sensible →
  hors périmètre autonome.

## Garde anti-récurrence

`src/lib/__tests__/fk-index-guard.test.ts` — vérifie qu'une migration crée un
index mené par chaque colonne de FK listée, et que la migration est réversible.

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1752/1752** (160 fichiers)
