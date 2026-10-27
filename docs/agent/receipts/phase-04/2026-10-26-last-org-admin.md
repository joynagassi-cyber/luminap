# Receipt — Phase 4 : invariant « ≥1 propriétaire » (PM5)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-04-last-org-admin`
- **Défaut visé** (pre-mortem PM5, priorité **24**) : rien n'empêchait de révoquer
  le **dernier** administrateur d'une organisation. L'org devenait orpheline —
  plus personne ne pouvait la réadministrer. Preuve avant : seuls
  `trg_org_admins_updated_at` + `trg_org_admins_audit` existaient sur
  `org_admins` (aucune garde de cardinalité).

## Livré (défense en profondeur)

| Couche | Fichier |
|---|---|
| Client (miroir) | `src/capabilities/organization/central.ts` → `assertNotLastOrgAdmin`, appelé par `revokeOrgAdmin` avant la mutation |
| Base (barrière finale) | `supabase/migrations/20261026000007_guard_last_org_admin.sql` → trigger `trg_org_admins_not_last` (BEFORE UPDATE OR DELETE) |
| Réversibilité | `supabase/migrations/rollback/20261026000007_rollback.sql` |

La fonction ne fait que **refuser** une écriture invalide ; elle ne modifie
aucune donnée.

## Preuve — trigger en base (transaction annulée, 0 résidu)

Appliqué sur la base de dev, puis exercé dans une transaction `ROLLBACK` :

| Cas | Résultat mesuré | Attendu |
|---|---|---|
| T1 révocation partielle (2 admins → 1) | ACCEPTÉ | ACCEPTÉ |
| T2 révoquer le **dernier** admin actif | REFUSÉ (`check_violation`) | REFUSÉ |
| T3 **supprimer** le dernier admin actif | REFUSÉ (`check_violation`) | REFUSÉ |
| T4 re-révoquer un grant déjà révoqué | ACCEPTÉ (idempotent) | ACCEPTÉ |

Vérification post-application :
`SELECT tgname FROM pg_trigger WHERE tgrelid='public.org_admins'::regclass`
→ `trg_org_admins_audit`, **`trg_org_admins_not_last`**, `trg_org_admins_updated_at`.

## Preuve — client (miroir TS)

| Gate | Sortie |
|---|---|
| `vitest run` (last-org-admin) | **4/4** |
| `vitest run` (suite) | **1275/1275** (91 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

Le test existant `organization-central.test.ts` a été mis à jour pour simuler
un second admin actif (cas nominal) et un nouveau cas verrouille le refus.

## Reste (assumé)

L'invariant couvre le lien **grant admin central** (`org_admins`). Le membership
local (`profiles.role='ADMIN'` sur son org) n'a pas d'équivalent : retirer le
dernier ADMIN local d'une org est un cas distinct, non traité ici (le champ
`profiles.org_id` est un rattachement, pas un grant révocable).
