# Receipt — Phase 11 : socle `org_settings` (réglages par organisation)

- **Date** : 2026-10-31
- **Branche** : `agent/pr-foundation-org-settings`
- **Statut** : terminé (PR brouillon ouverte)

## Problème

Deux features produit du contrat (`docs/agent/PROPOSALS.md`) ont besoin d'un
réglage **persistant, propre à l'organisation** :

- **PR8** — approbation en deux étapes (maker-checker), par défaut DÉSACTIVÉE ;
- **PR13** — gel de période comptable (date de clôture), par défaut AUCUN.

Il n'existait **aucun** magasin de réglages par organisation. La table `config`
déclarée dans le schéma PowerSync n'a **ni migration ni usage** (vestigiale, non
synchronisée : aucun stream). Implémenter PR8 et PR13 en parallèle sans socle
commun aurait produit deux migrations concurrentes et deux modules dupliqués.

## Livré

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261031000007_org_settings.sql` | table `org_settings (org_id, key, value)` + RLS (SELECT membre, écriture `admin:settings`) |
| `supabase/migrations/rollback/20261031000007_rollback.sql` | réversibilité |
| `src/lib/orgSettings.ts` | `getOrgSetting` / `setOrgSetting` / `clearOrgSetting` — **fail-safe** (défaut si absent/illisible), lecture non-lançante instrumentée |
| `src/lib/powersync/schema.ts` | table `org_settings` ajoutée au schéma client |
| `powersync/sync-config.yaml` | stream `org_settings` (auto_subscribe, filtre org) — **déployé** |
| `src/lib/__tests__/org-settings.test.ts` | 7 tests (round-trip, upsert, cloisonnement org, JSON invalide, erreur base) |
| `src/lib/schemaVersion.ts` | `CLIENT_SCHEMA_VERSION` 1 → 2 (nouvelle table de schéma) |
| `docs/agent/migration-drift.json` | instantané R17 re-mesuré (74→75 horodatés, empreinte SHA mise à jour) |

## Décisions d'intégration

- **Réglages par org, jamais globaux** : clé primaire `(org_id, key)`.
- **Fail-safe, pas fail-open ni fail-closed** : l'ABSENCE d'un réglage ne change
  RIEN au comportement existant (pas de contrainte financière activée par
  accident). C'est la politique des autres modules (`featureFlags`, `schemaVersion`).
- **Écriture via PowerSync** (chemin applicatif, rôle BYPASSRLS) : la RLS
  `admin:settings` ferme uniquement le client REST direct.
- **Règles métier hors du socle** : `makerChecker.ts` / `periodLock.ts`
  (à venir) reçoivent la valeur en entrée et restent **purs** donc testables.

## Vérifications

- `npx tsc -b --force --noEmit` → 0 erreur.
- `npx vitest run` → **168 fichiers, 1795 tests OK** (6 ignorés).
- `npx eslint` (fichiers neufs) → 0 erreur.
- `powersync validate` → ✓ ; `powersync deploy` (sync-config) → ✓.
