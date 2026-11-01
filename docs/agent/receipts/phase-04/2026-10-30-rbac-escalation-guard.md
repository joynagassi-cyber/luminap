# Reçu — R143 : garde anti-régression du substrat RBAC

- **Date** : 2026-10-30
- **Phase** : 04 (RLS / RBAC)
- **Branche** : `agent/r140-audit-append-only` (PR #157)
- **Statut** : **CORRIGÉ**

## Défaut

Les 4 correctifs CRITIQUES d'escalade de privilèges
(`supabase/migrations/20261022000010`–`20261022000014`) n'avaient **aucun test**.
Le seul test RBAC (`src/capabilities/__tests__/security.test.ts`) porte sur la
matrice de permissions **TS**, pas sur les garde-fous **base**. Une migration
future pouvait rouvrir la voie d'escalade sans qu'aucun test ne s'en aperçoive.

## Invariants vérifiés en base (transactions annulées, 2026-10-30)

| # | Invariant | Preuve mesurée |
|---|---|---|
| 1 | `profiles.role` immuable pour un client | `UPDATE profiles SET role='ADMIN'` → `42501 ROLE_IMMUTABLE` (trigger `guard_profile_role_immutable`) |
| 2 | Profil client ne peut pas naître privilégié | trigger `guard_profile_role_insert` (BEFORE INSERT) |
| 3 | `upsert_profile` refuse `p_role` sans `is_org_admin` | `upsert_profile(...,'ADMIN',...)` → `42501 ROLE_NOT_ALLOWED` |
| 4 | `org_memberships` INSERT/UPDATE gardés | politiques `om_insert`/`om_update` = `is_org_admin` ; pas d'auto-adhésion |
| 5 | `org_admins`/`grants` gardés par `is_org_admin` | inspection `pg_policies` |

**Piège clé** : le trigger `guard_profile_role_immutable` teste
`current_user IN ('authenticated','anon')`. Dans une fonction SECURITY DEFINER,
`current_user` = le **propriétaire** → le trigger ne voit pas l'appel. D'où la
garde **propre** de `upsert_profile` (`is_org_admin`), indispensable.

## Correctif

Nouveau test `src/lib/__tests__/rbac-escalation-guard.test.ts` (8 assertions),
qui lit les migrations (patron `audit-append-only-guard.test.ts`, sans base) :

- existence des triggers `guard_profile_role_immutable` / `guard_profile_role_insert` ;
- aucune migration tardive ne supprime un trigger de garde **sans le recréer** ;
- la **dernière** définition de `upsert_profile` contient la garde `is_org_admin`
  et `ROLE_NOT_ALLOWED` ;
- `om_insert`/`om_update` gardés par `is_org_admin` ; plus d'auto-adhésion ;
- `om_all_merged` n'est jamais recréée après sa suppression ;
- les 4 rollbacks existent.

## Portes

- `npx tsc -b` → **exit 0**
- `npx vitest run` → **1723/1723** (154 fichiers), dont les 8 nouveaux.

## Références

- R143 (RISQUES.md) ; R137/R140/R141 (RLS) ; R109 (rôle ADMIN) ; R139 (piège
  `current_user` en SECURITY DEFINER).
