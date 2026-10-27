# Receipt — Phase 9 : erreur de synchronisation VISIBLE (PM19)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-09-sync-error-visible`
- **Défaut visé** (pre-mortem PM19, priorité **48** = la plus haute du registre) :
  une mutation en file dont l'envoi échoue restait **silencieuse**. PowerSync
  expose `uploadError` / `downloadError`, mais ils n'étaient que `console.debug`
  dans `registerListener`. L'indicateur du tableau de bord affichait
  « sync HH:MM » comme si tout allait bien → l'utilisateur quittait en croyant
  sa saisie enregistrée alors qu'elle n'était jamais partie.

## Mesure (avant)

- `usePowerSyncIndicator` renvoyait `{ online, lastSyncAt, syncing }` — **aucune**
  erreur.
- `powersync/index.ts` (registerListener) journalisait `uploadError?.message`
  uniquement en console.

## Livré

- `src/lib/hooks/usePowerSyncIndicator.ts` : expose `syncError`
  (`uploadError?.message ?? downloadError?.message ?? null`).
- `src/pages/Dashboard.tsx` : le pill de synchronisation affiche
  **« échec d'envoi »** (rouge) dès qu'une erreur existe, prioritaire sur
  « hors ligne » / « synchronisation… » / « sync HH:MM ».
- `src/lib/__tests__/powersync-indicator.test.ts` (3, jsdom) : expose l'erreur
  d'upload, l'erreur de download, et `null` quand tout va bien.

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (powersync-indicator) | **3/3** |
| `vitest run` (suite) | **1254/1254** (87 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Reste (assumé)

L'indicateur est global (une erreur bloque/colore le pill du tableau de bord).
Un indicateur **par élément** (chaque transaction en file avec son propre état)
reste à faire — nécessite de croiser la file d'upload avec les lignes locales.
