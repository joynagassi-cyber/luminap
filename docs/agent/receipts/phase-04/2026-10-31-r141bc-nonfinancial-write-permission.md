# Receipt — R141.b / R141.c : écriture gardée par permission sur les tables non financières

- **Date** : 2026-10-31
- **Risque** : R141.b / R141.c (MOYENNE — écriture non gouvernée via REST direct ;
  pas d'escalade)
- **Statut** : CORRIGÉ (livré + prouvé)
- **Branche** : `agent/r140-audit-append-only` (PR #157)

## Défaut

8 tables **non financières** hors périmètre de R141 gardaient leurs politiques
INSERT/UPDATE/DELETE fondées sur `is_org_member(...)` **SEUL** → tout MEMBRE
pouvait écrire au niveau base via le client REST direct (clé anon publique +
JWT). Aucune escalade (ces tables ne portent ni rôle ni appartenance), mais
écriture non gouvernée sur des données de configuration et de gestion
documentaire.

## Décision (autonomie 2026-10-31) — aucune nouvelle permission (toutes canon)

| Table | Permission | Justification |
|---|---|---|
| `documents` (R141.b) | `admin:settings` | gestion documentaire / Archives |
| `event_tasks` (R141.b) | `event:update` | sous-ressource des événements |
| `report_definitions` (R141.c) | `report:export` | édition de rapports |
| `custom_field_definitions` (R141.c) | `admin:settings` | schéma de champs |
| `custom_field_values` (R141.c) | `admin:settings` | valeurs (portée via définition) |
| `form_definitions` (R141.c) | `admin:settings` | constructeur de formulaires |
| `form_submissions` (R141.c) | `admin:settings` | données de formulaires |
| `categories` (R141.c) | `admin:settings` | taxonomie canonique |

- **`documents` : pas de politique DELETE créée.** La table n'en avait aucune
  (deny-all REST) — l'ouvrir serait une **nouvelle capacité**, hors d'un
  durcissement. Seules INSERT/UPDATE sont re-créées.
- **Hors périmètre (justifié)** : `role_assignments` — table morte (0 référence
  client, hors sync-config) ; toute politique y est sans objet.

## Sûreté (mesurée)

- **Aucun** chemin d'écriture REST (`supabase.from(...)`) n'existe pour ces
  tables dans le client : toutes les écritures applicatives passent par
  PowerSync (`powersync_role` = **BYPASSRLS**, vérifié) → ces politiques ne
  peuvent pas casser un flux applicatif.
- Aucune migration tardive ne réécrit ces politiques sans `has_permission`
  (garde anti-dérive).

## Livrables

- `supabase/migrations/20261031000002_rls_write_permission_r141bc.sql`
- `supabase/migrations/rollback/20261031000002_rollback.sql`
- `src/lib/__tests__/r141bc-write-permission-guard.test.ts` (5 assertions)
- `docs/agent/migration-drift.json` (re-mesuré : 70 horodatées / 63 séquentielles
  / 133 total, empreinte SHA-256 mise à jour)

## Preuve (instance DEV, transaction annulée → 0 résidu)

- `INSERT INTO categories` en tant que **MEMBRE** → **`42501`**
  (« new row violates row-level security policy »).
- `INSERT INTO categories` en tant que **PASTEUR_PRINCIPAL** (`admin:settings`)
  → **accepté** (`count = 1`).
- Résidus : `residus_categories = 0`, `residus_profiles = 0`.
- Advisors sécurité : **inchangés** (aucun `rls_enabled_no_policy` nouveau ; les
  3 signalés sont des tables reliquats en deny-all, cf. R97).
- `powersync_role` / `service_role` : `rolbypassrls = true` (confirmé).

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1741/1741** (157 fichiers)
