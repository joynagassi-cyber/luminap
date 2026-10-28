# Receipt — R123 : restauration d'une organisation archivée (fin du cul-de-sac)

- **Date** : 2026-10-28
- **Phase** : 4 (administration centrale / cycle de vie des organisations)
- **Branche** : `agent/r123-org-archive-restore`
- **Statut** : ✅ CORRIGÉ

## Défaut 1 — cul-de-sac UI

`CentralAdmin.tsx` : `SUSPENDED ? « Réactiver » : ACTIVE ? « Suspendre » : null`.
Une organisation **ARCHIVED** n'avait donc **aucune action** — irrécupérable
depuis l'UI, alors que `reactivateOrganization` existe et que le cycle de vie
sanctionné est réversible (ARCHIVED ≠ DELETE).

## Défaut 2 — métadonnées d'archivage non nettoyées

`setOrganizationStatusPS(…, "ACTIVE")` remettait `status='ACTIVE'` et
nettoyait `suspended_*` mais laissait `archived_at/archived_by/archive_reason`
→ une org restaurée restait marquée « archivée le … ».

## Correctif

1. `dataLayer.ts` : le chemin `ACTIVE` nettoie aussi les 3 colonnes d'archivage.
2. `CentralAdmin.tsx` : branche `ARCHIVED` → bouton « Restaurer »
   (`data-testid="restore-<id>"`) appelant `reactivateOrganization`.

## Garde anti-dérive

`src/lib/__tests__/org-lifecycle-restore.test.ts` (3 tests) : nettoyage SQL
complet (6 colonnes), métadonnées renseignées à l'archivage, câblage UI.
**Non-vacuité prouvée** (SQL et UI).

## Gates

- `npx vitest run` : **1560/1560** (126 fichiers)
- `npx tsc -b` : 0 erreur
- `npx eslint` (fichiers touchés) : 0 erreur
