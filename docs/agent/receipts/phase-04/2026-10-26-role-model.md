# Receipt — Phase 4 : R109 rôle `ADMIN` DB-only + garde anti-dérive du modèle de rôles

- **Date** : 2026-10-26
- **Branche** : `agent/phase-04-role-model`
- **Contexte** : le câblage réel de la garde de route (R105/R107) est bloqué par
  la réconciliation du modèle de rôles. Ce chantier mesure l'écart, le fige et
  le documente — il **débloque la décision** propriétaire.

## Mesure (instance DEV `hhgovvrnalibhgpakswi`, 2026-10-26)

| Artefact | Constat |
|---|---|
| Rôles canon TS (`PERMISSION_MATRIX`) | **14** |
| `role_permissions` (DB) | **14 rôles, 149 lignes** — **identiques** à la migration SQL |
| Migration `20261026000002_rbac_has_permission.sql` | **≡** `role_permissions` (vérifié) |
| `profiles.role='ADMIN'` | **1** ligne |
| `org_memberships.role='ADMIN'` | **1** ligne |
| `role_permissions.role='ADMIN'` | **0** ligne |
| `ADMIN` dans `Role` (TS) / `PERMISSION_MATRIX` | **absent** |
| Politiques RLS testant `profiles.role='ADMIN'` en dur | **3** (`org_admins_insert_merged`, `org_admins_update_merged`, `orgs_update_merged`) |

**Preuve d'effet** pour le compte admin central :

```sql
select public.has_permission(<admin>, 'org-1', 'admin', 'settings');   -- false
select public.has_permission(<admin>, 'org-1', 'transaction', 'read'); -- false
select public.is_org_admin(<admin>, 'org-1');                          -- false
```

→ Le compte admin central n'a **aucun droit** via `has_permission` : toute route
à `permission` (ex. `/admin*`, `admin:settings`) le refuse. Il n'agit que via
les politiques RLS qui lisent `profiles.role='ADMIN'` en dur.

## Livré

- `docs/agent/role-model.json` — instantané **mesuré** (14 rôles + 149
  permissions + écart `ADMIN` documenté + littéraux RLS).
- `src/lib/__tests__/role-model-drift.test.ts` (4 tests) — verrouille TS ↔
  migration SQL ↔ instantané ; échoue si un rôle est ajouté/retiré sans mise à
  jour explicite ; exige que `ADMIN` reste hors canon et sans permissions tant
  que R109 n'est pas tranché.
- `RISQUES.md` : **R109** (nouveau) + mise à jour **R16** (0 divergence mesurée
  dans les données actuelles ; risque de modèle subsistant).
- `DECISIONS.md` : **D-S10-1** (conservateur : ne pas trancher en autonomie).

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (role-model-drift) | **4/4** |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Décision requise (propriétaire)

1. **Supprimer `ADMIN`** : admin central uniquement via grants `org_admins`
   (nettoyer le littéral dans les 3 politiques RLS), ou
2. **Ajouter `ADMIN` au canon** (`Role` + `PERMISSION_MATRIX` +
   `role_permissions`) avec les droits d'administration centrale.

Tant que non tranché : aucun changement de données ni de politique (conservateur).
