# Receipt — R17 : réconciliation des objets dépôt ↔ base (delta nul)

- **Date** : 2026-10-31
- **Risque** : R17 (dérive migrations ↔ base)
- **Statut** : delta dépôt↔base des objets = **0** (reste ouvert comme *choix de
  gouvernance* de l'historique, cf. RISQUES §R17)
- **Branche** : `agent/r140-audit-append-only` (PR #157)

## Demande propriétaire

« Assure-toi d'appliquer toutes les migrations sur Supabase. »

## Méthode

Recoupement **exhaustif** dépôt ↔ base (et non pas confiance au seul tracker,
qui est structurellement disjoint — 2/79 versions communes) :

- 40 `CREATE TABLE` du dépôt → **40 présents** en base.
- 39 `CREATE FUNCTION` du dépôt → **38 présents** ; seul `agent_try_jsonb` est
  absent **par conception** (`DROP FUNCTION` en fin de sa propre migration
  `20261024000001`).
- 31 `CREATE TRIGGER` → **29 présents** avant correction (2 manquants).
- 1 vue (`org_family`) → présente (+ `org_federation`, héritée).

## Écart trouvé (et corrigé)

Le fichier historique `20260909000002_create_invitation_system.sql` n'a **jamais**
été appliqué en l'état : son contenu a été remplacé en base par la migration
`invitation_system_v3` (version tracker `20260921174834`). Trois objets qu'il
déclare n'existaient donc pas :

| Objet | Type | Redondant ? |
|---|---|---|
| `mark_expired_invitations()` | fonction | oui — l'expiration est appliquée en ligne par `settle_invitation_claim` (`now_ts > inv.expires_at OR status='EXPIRED'`) |
| `update_invitations_updated_at` | trigger | oui — le client et le trigger de règlement positionnent `updated_at` |
| `update_invitation_claims_updated_at` | trigger | oui — idem |

## Correctif

Migration idempotente `20261031000003_reconcile_invitation_system_objects.sql` :
recrée les 3 objets (aucun effet destructeur ; redondants, donc sans impact
applicatif) + rollback `rollback/20261031000003_rollback.sql` + garde
`src/lib/__tests__/r17-reconciliation-guard.test.ts` (4 assertions).

## Preuve (après application, instance DEV)

- Fonctions manquantes : **0** (`agent_try_jsonb` exclu, par conception).
- Triggers manquants : **0**.
- Tables manquantes : **0** ; vues manquantes : **0**.
- `docs/agent/migration-drift.json` mis à jour : `repo_db_object_delta =
  0/0/0/0` ; `applied_versions_in_tracker=79`, `repo_timestamped_files=71`,
  `drift_ratio="2/79"`, empreinte SHA-256 re-mesurée.
- `migration-drift-guard.test.ts` : ratio re-mesuré (`2/70` → `2/79`).

## Gates

- `npx tsc -b` → **0**
- `npx vitest run` → **1745/1745** (158 fichiers)

## Note

Conformément à R17, **`supabase db push` n'a PAS été lancé** (il rejouerait 63
migrations non tracées sur un schéma où leur contenu existe déjà). Les
correctifs ont été appliqués via le MCP (`apply_migration`), qui trace la
version — chemin déjà en vigueur sur ce projet.
