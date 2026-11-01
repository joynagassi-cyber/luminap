# Receipt — R141.d : clôture du chantier d'autorisation d'ÉCRITURE

- **Date** : 2026-10-31
- **Risque** : R141 (écriture « membre seul ») — **dernier lot**
- **Statut** : **CORRIGÉ** (livré + prouvé)
- **Branche** : `agent/r140-audit-append-only` (PR #157)

## Contexte

Le chantier d'autorisation d'écriture a été mené en quatre vagues :

| Vague | Migration | Portée |
|---|---|---|
| R137 | `20261029000002` | 15 politiques (transactions, versements, members, events, groups) |
| R141 | `20261031000001` | 14 tables **financières** (+ nouvelle permission `finance:manage`) |
| R141.b/c | `20261031000002` | 8 tables **non financières** |
| **R141.d** | `20261031000004` | **4 dernières tables** |

## Défaut mesuré (recoupement `pg_policies`)

Après R141.b/c, 4 tables conservaient des politiques INSERT/UPDATE/DELETE
fondées sur `is_org_member(...)` **SEUL** :

| Table | Politiques | Traitement |
|---|---|---|
| `invitation_claims` | UPDATE | `invitation:manage` |
| `notifications` | INSERT / UPDATE / DELETE | `admin:settings` |
| `role_assignments` | INSERT / UPDATE / DELETE | `admin:settings` (table morte) |
| `audit_entries` | INSERT | **laissé** (correct) |

`invitations` était déjà gardée (`is_org_member AND can_manage_invitations`).

## Décision (autonomie, aucune nouvelle permission)

- `invitation_claims` → `invitation:manage` (canon : ADMIN, ANCIEN,
  PASTEUR_PRINCIPAL, TREASURIER — cohérent avec `can_manage_invitations`).
- `notifications` / `role_assignments` → `admin:settings` (pas de permission
  canon spécifique ; précédent R141.b/c). `role_assignments` = **table morte**
  (0 référence dans tout le dépôt, hors sync-config).
- `audit_entries` INSERT **laissé** : un journal d'audit trace l'action de
  l'acteur lui-même ; le restreindre priverait les non-managers de traçabilité.
  UPDATE/DELETE reste deny-all (R140).

## Sûreté

Aucun chemin d'écriture REST (`supabase.from`) de ces tables côté client : tout
passe par PowerSync (`powersync_role` = **BYPASSRLS**). Les triggers `notify_*`
s'exécutent dans ce contexte ou en DEFINER (`notify_transaction_change`). Durcir
la RLS REST ne peut donc pas casser un flux applicatif.

## Preuve (instance DEV, transaction annulée)

Impersonation `authenticated` + `request.jwt.claims.sub` :

| Acteur | `is_org_member` | `has_permission(admin:settings)` | `INSERT notifications` |
|---|---|---|---|
| MEMBRE | true | **false** | **refusé** |
| PASTEUR_PRINCIPAL | true | **true** | **accepté** |

0 résidu (`notifications` test = 0, `org_memberships` test = 0). Advisors
sécurité **inchangés** (aucun `rls_enabled_no_policy` nouveau).

## Vérification de clôture

Requête d'audit après application : **plus aucune** politique d'écriture REST
non gardée, hormis :
- `audit_entries` INSERT (laissé volontairement) ;
- `invitations` INSERT/UPDATE/DELETE (déjà gardée par `can_manage_invitations`).

Le chantier R137 / R140 / R141 est **complet**.

## Livrables

- `supabase/migrations/20261031000004_rls_write_permission_r141d.sql`
- `supabase/migrations/rollback/20261031000004_rollback.sql`
- `src/lib/__tests__/r141d-write-permission-guard.test.ts` (5 assertions)
- `docs/agent/migration-drift.json` re-mesuré (80/72/63/135, ratio `2/80`)

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1750/1750** (159 fichiers)
