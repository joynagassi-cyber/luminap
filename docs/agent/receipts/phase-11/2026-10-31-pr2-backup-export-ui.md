# Receipt — Phase 11 / PR2 : Export & sauvegarde des données (UI)

- **Date** : 2026-10-31
- **Branche** : `agent/pr2-data-backup-ui`
- **Livrable** : PR2 (« Export/sauvegarde des données (UI) »,
  `docs/agent/PROPOSALS.md`) — statut **MANQUANT** avant ce lot.

## Défaut corrigé

Aucune interface ne permettait de sauvegarder les données de l'organisation.
Les seuls exports existants (`src/lib/export.ts` : `exportPDF` / `exportExcel`
/ `exportCSV`) sont **finance-only** (signature `ExportOptions` portant
`transactions: Transaction[]`) et câblés uniquement sur `/balance` et
`/reports`. Il n'existait **aucune** sauvegarde complète (toutes entités,
auto-descriptive, relisible).

## Ce qui a été livré

| Fichier | Rôle |
|---|---|
| `src/lib/backup.ts` | **Module pur** : `buildBackupBundle` (enveloppe auto-descriptive, `counts` dérivé de `data`, déterministe), `serializeBackup` (JSON indenté), `backupToCsv` (un CSV, colonne `entity`, **chaque** ligne via `escapeCsvRow`), `backupFilename`. |
| `src/hooks/useBackupData.ts` | Collecte les données de l'org ACTIVE via les hooks `dataLayer` existants (`useTransactions`…`useDocuments`) + `listFormDefinitionsPS` / `listCustomFieldDefinitionsPS`. Expose `ready = isPowerSyncReadyNow()`, `counts`, `total`, `buildBundle()`. |
| `src/pages/SettingsGestion.tsx` | Section « Sauvegarde des données » (Paramètres → Gérer) : boutons « Exporter mes données (JSON) » et « Exporter (CSV) », état de chargement, toast FR succès/échec, `captureClientError` en cas d'erreur. |
| `src/pages/Tutorial.tsx` | Section « Sauvegarde des données » (Phase 13). |
| `src/lib/__tests__/backup.test.ts` | 12 tests purs (counts, déterminisme, round-trip JSON, échappement OWASP). |
| `src/pages/__tests__/SettingsGestion-backup.test.tsx` | 5 tests jsdom (câblage boutons, R52, CSV neutralisé, capture d'erreur). |
| `docs/agent/COVERAGE_MATRIX.md` | 1 ligne ajoutée (Phase 11, PR2). |

## Règle « pas encore lu ≠ vide » (R52)

`useBackupData.ready = isPowerSyncReadyNow()`. Tant qu'il est faux, l'écran
affiche « Chargement des données… » (testid `backup-pending`) et **désactive**
les deux boutons d'export : aucun compte « 0 élément » n'est présenté comme un
fait avant la première lecture PowerSync.

## Sécurité (CSV)

Tout export CSV passe par `escapeCsvRow` (`src/lib/csv.ts`) — anti-injection de
formule OWASP. Une valeur `=1+1` ou `@cmd` est préfixée d'une apostrophe ; le
test le vérifie par expression régulière (`/(^|;)=1\+1/` **absent**).

## Non-vacuité (vérifié, puis restauré)

1. **Module pur** — remplacement de `escapeCsvRow(...)` par un `join(";")` brut
   et `counts[entity] = rows.length` par une constante ⇒ **4 tests** de
   `backup.test.ts` passent au rouge.
2. **UI** — remplacement de la garde `{!backup.ready ? … }` par un rendu direct
   du compte ⇒ le test « affiche un squelette et aucun compte quand la réplique
   n'est pas lue » échoue (`0 élément` visible).

## Gates

- `npx tsc -b --noEmit` : OK
- `pnpm run lint` : OK
- `pnpm exec vitest run` : OK
- `pnpm run build` : OK

## Limites

- L'import / restauration du fichier de sauvegarde n'est pas couvert par ce lot
  (PR2 cible l'**export**). Le format `lumina-backup` v1 est conçu pour être
  relisible (JSON auto-descriptif) afin de préparer une restauration future.
- Le CSV aplatit les objets imbriqués en JSON (une cellule par valeur) : c'est
  un format de contrôle tableur, pas une sauvegarde de restauration — le JSON
  reste la sauvegarde de référence.
