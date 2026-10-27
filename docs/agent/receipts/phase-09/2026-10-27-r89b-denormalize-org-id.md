# Receipt — Phase 9 : R89.b corrigé (dénormalisation `org_id` + `PSYNC_S2305`)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-09-r89b-denormalize-org-id`
- **Défaut visé** : R89.b (impact 5) — sur un profil à fort volume, la
  synchronisation descendante échouait (`PSYNC_S2305 Too many parameter query
  results, limit of 1000`) : l'appareil ne recevait **jamais** ses données.

## Cause racine (mesurée, non supposée)

Les streams PowerSync `group_memberships`, `event_budgets`, `budget_lines` et
`custom_field_values` filtraient par **jointure** sur la table parente :

```sql
SELECT child.* FROM child JOIN parent ON … WHERE parent.org_id IN (…)
```

PowerSync ne peut pas clé la partition sur une colonne absente de la ligne
synchronisée : il clé sur la clé de la ligne jointe (`group_id`, `event_id`,
`event_budget_id`, `custom_field_definition_id`) → **un bucket par ligne enfant**,
donc une requête de paramètre par ligne. Sur `org-e2e` (6709 événements), le
plafond de 1000 est franchi et le flux échoue.

Hypothèse initiale (« `profiles` > 1000 lignes ») **réfutée** : la base ne
compte que 108 profils ; la cause est le nombre de lignes **enfant**.

## Correctif

1. **Migration `20261027000001_denormalize_org_id_sync_scope.sql`**
   - ajoute `org_id` sur les 4 tables enfants + backfill depuis le parent ;
   - garde-fou : échoue si une ligne reste sans `org_id` ; puis `SET NOT NULL` ;
   - index sur `org_id` (colonne de filtre des streams) ;
   - triggers de cohérence (génériques) :
     - `BEFORE INSERT OR UPDATE` sur l'enfant → recopie `org_id` depuis le parent ;
     - `AFTER UPDATE OF org_id` sur le parent → propage aux enfants.
2. **`powersync/sync-config.yaml`** — les 4 streams passent au filtre direct
   `WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())`
   (même clé de partition que toutes les autres tables → 1 bucket par org).
3. **Schéma client** `src/lib/powersync/schema.ts` — ajout de `org_id` sur les
   4 tables (le connecteur mappe par nom de colonne).

## Preuve

| Gate | Sortie |
|---|---|
| `powersync validate` | ✓ Validate Sync Config (All validation tests passed) |
| `powersync deploy sync-config` | Deployment operation completed successfully |
| Sync live profil fort volume (`org-e2e`, 6709 événements) | **AVANT** : `PSYNC_S2305`, 0 ligne · **APRÈS** : `connected:true`, `hasSynced:true`, **`events: 6709`** |
| Triggers (transaction annulée) | `group_memberships`→`org-e2e` ; `event_budgets`→`org-1` ; `budget_lines`→`org-1` ; `custom_field_values`→`org-e2e` |
| Backfill (cohérence enfant↔parent) | 0 écart sur les 4 tables |
| `vitest run` | **1279/1279** (92 fichiers) |
| `npx tsc -b` | exit 0 |
| `eslint` (fichiers touchés) | 0 erreur |

## Défaut connexe découvert et corrigé (R110)

En testant les triggers, `insert into budget_lines` échouait avec
`ERROR 42703: record "new" has no field "event_id"` — déclenché par le trigger
**pré-existant** `notify_budget_exceeded()` (migration 0042, revue en
20261022000003 pour le booléen `is_read` mais **pas** pour ces colonnes).

- `budget_lines` n'a pas de colonne `event_id` (sa FK est `event_budget_id`) ;
  la fonction lisait `NEW.event_id` et agrégeait sur `event_budget_id = NEW.id`.
- Conséquence : **toute création de ligne budgétaire échouait** (trigger AFTER
  INSERT → transaction annulée).
- Correctif : migration `20261027000002_fix_notify_budget_exceeded_event_budget_id.sql`
  (résolution de l'événement via `event_budgets`, agrégat sur le bon budget).
- Preuve : `insert into budget_lines … returning org_id` → **ACCEPTÉ** (`org-1`),
  là où c'était `ERROR 42703`.

## Rollbacks

- `rollback/20261027000001_rollback.sql` (retire colonnes, triggers, index, fonctions).
- `rollback/20261027000002_rollback.sql` (restaure la version 20261022000003).
