# Receipt — R141 : autorisation d'écriture des tables financières

- **Date** : 2026-10-31
- **Risque** : R141 (HAUTE — contrôle d'accès / intégrité financière)
- **Statut** : CORRIGÉ (livré + prouvé)
- **Branche** : `agent/r140-audit-append-only` (PR #157)

## Défaut

Suite de R137 (qui n'avait câblé que 15 politiques : transactions, versements,
members, events, groups). **26 tables** `public` avaient au moins une politique
d'écriture (`INSERT`/`UPDATE`/`DELETE`) fondée sur `is_org_member(...)` **seul** :
tout **membre** de l'org pouvait écrire au niveau base (REST direct), dont des
tables **financières** (`accounts`, `caisses`, `org_budgets`, `tax_receipts`,
`pledges`, `giving_*`).

Exploitabilité prouvée : `INSERT INTO accounts` accepté par la RLS.
Escalade de privilèges **réfutée** : `org_memberships`/`grants`/`org_admins`
gardés par `is_org_admin` ; `profiles.role` immuable (`42501 ROLE_IMMUTABLE`).

## Décision (autonomie accordée « OK ALLONS Y »)

Périmètre : **14 tables**, 2 lots.

| Lot | Tables | Permission |
|---|---|---|
| 1 (existante) | `cotisations` | `cotisation:manage` |
| 1 (existante) | `group_memberships` | `group:update` |
| 1 (existante) | `org_units` | `admin:settings` |
| 2 (nouvelle) | `accounts`, `caisses`, `org_budgets`, `org_budget_lines`, `budget_lines`, `event_budgets`, `pledges`, `giving_campaigns`, `giving_donors`, `transaction_giving`, `tax_receipts` | `finance:manage` |

Détenteurs de `finance:manage` : ADMIN, PASTEUR_PRINCIPAL, TREASURIER,
TREASURIER_ADJOINT (miroir TS `PERMISSION_MATRIX` + `role-model.json`).

**Hors périmètre (justifié)** :
- `categories` — écrite dynamiquement par le cycle de vie `UPDATE ${table}`
  (risque de casse) ;
- `role_assignments` — table morte (0 référence client, hors sync-config) ;
- `notifications`, `custom_field_*`, `form_*`, `report_definitions` — pas de
  permission canon, non financier → R141.c ;
- `documents`, `event_tasks` — appartenance non triviale → R141.b.

**Sûreté mesurée** : le chemin d'écriture applicatif passe par PowerSync dont le
rôle `powersync_role` porte **BYPASSRLS** (vérifié). Ces politiques ne peuvent
donc pas casser un flux applicatif ; elles ferment le client REST direct.

## Livrables

- `supabase/migrations/20261031000001_rls_write_permission_r141.sql`
- `supabase/migrations/rollback/20261031000001_rollback.sql`
- `src/lib/__tests__/r141-write-permission-guard.test.ts` (5 assertions)
- TS : `finance:manage` ajoutée au type `Permission`, à `PERMISSION_MATRIX`
  (ADMIN, PASTEUR_PRINCIPAL, TREASURIER, TREASURIER_ADJOINT) et à la capacité
  `finance.manage` ; miroir SQL `20261026000002` + `role-model.json` +
  `migration-drift.json` (R17) re-mesurés.

## Preuve (instance DEV, transactions annulées)

| Test | Résultat |
|---|---|
| MEMBRE → `INSERT INTO accounts` | **`42501`** (RLS refuse) |
| TREASURIER → `INSERT INTO accounts` | **accepté** (`has_permission(...,'finance','manage')=true`) |
| Politiques gardées | 42 (14 tables × 3) |
| Résidus | 0 (`accounts`, `org_memberships`) |

## Portes

- `npx tsc -b` → 0
- `npx vitest run` → **1728/1728** (155 fichiers)

## Vérification CI (PR #157, commit `0f3d2ff`)

- **Tous les gates PR verts** : Build, Debug APK, E2E (Cypress PR-gate), Lint,
  Security Audit, TypeScript, Unit Vitest, Socket.
- **Workflow Cypress « push » (shards) : rouge pré-existant** — signature
  inchangée (10 specs, déterministe ; R98/R53/R83 : environnement E2E
  PowerSync). **Contrôle discriminant** : dans `finance-deep.cy.ts`, les tests
  d'**écriture** financière **passent** (« creates a transaction and returns to
  /finance » ✓, « transaction detail and edit pages » ✓) ; seul « renders
  /balance with period toggles » échoue sur un **timeout de rendu** (« Expected
  to find element: `h1, h2, h3, header`, but never found it »). Une régression
  RLS aurait fait échouer les écritures → ce n'est **pas** une régression R141.

