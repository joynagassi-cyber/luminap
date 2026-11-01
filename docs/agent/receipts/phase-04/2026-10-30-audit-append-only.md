# Phase 4 — R140 : journal d'audit en ajout seul (`audit_entries`) — CORRIGÉ

- **Date** : 2026-10-30
- **Priorité** : P1 (intégrité de la traçabilité — anti-traçabilité)
- **Statut** : **CORRIGÉ** — migration `20261030000001_audit_entries_append_only.sql`
- **Branche** : `agent/r140-audit-append-only`

## Défaut mesuré

`audit_entries` est le journal d'audit canonique (invariant « toute mutation est
tracée »). Deux politiques d'écriture reposaient sur `is_org_member(...)` seul :

| Politique | Commande | Condition |
|---|---|---|
| `audit_entries_delete` | DELETE | `is_org_member(initplan_uid(), org_id)` |
| `audit_entries_update` | UPDATE | `is_org_member(...)` (USING + WITH CHECK) |

Conséquence : **tout membre** de l'organisation pouvait `UPDATE`/`DELETE`
n'importe quelle entrée d'audit de son org → **effacer ou falsifier la trace de
ses propres actions**. Non couvert par R137 (qui portait sur les tables métier).

Constat complémentaire (mesuré) :
- aucune FK entrante ni cascade ne dépend d'un `DELETE` sur `audit_entries` ;
- aucun chemin applicatif n'écrit en `UPDATE`/`DELETE` (`src/` = `INSERT`/`SELECT`
  uniquement ; les triggers de traçabilité sont `SECURITY DEFINER`).

## Correctif

Retrait des deux politiques. Sans politique, la RLS est *deny-all* pour
`UPDATE`/`DELETE` : l'altération devient impossible. Les `INSERT` (voie REST
authentifiée) et les écritures des triggers (`service_role` / `powersync_role`,
BYPASSRLS) restent **inchangés**.

Réversible : `rollback/20261030000001_rollback.sql` (recrée les 2 politiques
à l'identique).

## Preuves mesurées (instance DEV `hhgovvrnalibhgpakswi`, transaction annulée)

| Contrôle | Résultat |
|---|---|
| membre `authenticated` : `UPDATE audit_entries SET comment='TAMPERED'` | **0 ligne affectée** |
| membre `authenticated` : `DELETE FROM audit_entries WHERE org_id=…` | **0 ligne affectée** |
| `count(*)` avant/après | **62 / 62** (inchangé) |
| `count(*) WHERE comment='TAMPERED'` (post-test) | **0** (aucune falsification) |
| `INSERT` d'une entrée d'audit par un membre | **ACCEPTÉ** (journalisation préservée) |
| `pg_policies` sur `audit_entries` après | **2** (SELECT + INSERT seulement) |

## Gardes repo-side (exécutables partout)

- `src/lib/__tests__/audit-append-only-guard.test.ts` — 3 assertions : la
  migration retire les 2 politiques ; **aucune** migration postérieure ne les
  recrée ; la migration est réversible.
- `src/lib/__tests__/rls-inventory.test.ts` — inventaire régénéré (**44 tables**,
  `audit_entries` = 2 politiques) ; allowlist *deny-all* étendue à
  `_jsonb_null_literal_20261027`.
- `migration-drift-guard.test.ts` (R17) — instantané mis à jour (68 horodatés,
  131 total, empreinte `3d9cdf10…`).

## Gates

- `npx tsc -b` → **exit 0**
- `npx vitest run` → **1715/1715** (153 fichiers)

## Suite (R141 — ouvert)

R140 ne traite qu'`audit_entries`. **26 autres tables** (dont des tables
**financières** : `accounts`, `caisses`, `tax_receipts`, `org_budgets`,
`pledges`, `giving_*`) restent en écriture « membre seul ». Exploitabilité
prouvée (`INSERT accounts` accepté par la RLS). Non corrigé : décision de
périmètre requise (le vocabulaire de permissions canon ne couvre pas ces
tables). Cf. RISQUES.md §R141.

### Précisions mesurées ajoutées à R141 (2026-10-30)

- **3 tables retirées** après vérification des politiques : `invitations` et
  `invitation_claims` (gardées par `can_manage_invitations`), `profiles`
  (self-only, `initplan_uid() = id`).
- **Escalade de rôle testée et RÉFUTÉE** (transaction annulée) :
  `org_memberships`/`grants`/`org_admins` sont gardés par `is_org_admin` ;
  `has_permission` lit `org_memberships.role`/`grants` (pas `role_assignments`,
  qui est une table de rôle de session) ; `profiles.role` est **immuable** pour
  un membre (`guard_profile_role_immutable` → `42501 ROLE_IMMUTABLE`).
  → R141 est un risque d'**écriture directe**, pas d'escalade.
