# Receipt — R52.o / R52.p + durcissement de la garde statique

- **Phase** : 11
- **Priorité** : P2
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## R52.o — `/reports` : « Aucun rapport personnalisé » avant la lecture

**Défaut double**
1. La garde `if (isLoading)` de `/reports` était **morte** : `useTransactions()`
   renvoie `isLoading: false` en dur (D-R41) → `ReportsSkeleton` jamais rendu.
2. `savedReports` provient de `reportDefinitionRepo.list()` (asynchrone) : la
   liste valait `[]` tant que la lecture n'était pas finie, et l'écran annonçait
   « Aucun rapport personnalisé » — l'utilisateur croyait avoir perdu ses
   rapports.

**Correctif**
- Garde `isLoading || ((transactions?.length ?? 0) === 0 && !isPowerSyncReadyNow())`.
- Drapeau `savedLoaded` posé dans un **`finally`** ; squelette `ListSkeleton`
  tant que la lecture n'est pas terminée.

## R52.p — `DocumentPicker` : « Aucun document uploadé pour le moment. »

**Défaut** : composant partagé (jointures de rapports). Il consommait
`useDocuments()` **sans lire `isLoading`** et dérivait le verdict vide de la
seule longueur du tableau.

**Correctif** : `documentsPending = documentsLoading || !isPowerSyncReadyNow()`
→ « Chargement des documents… ».

## Durcissement de la garde statique

Le motif fautif exact — *verdict vide gardé par un `isLoading` mort* — n'était
pas détectable : `isLoading` figurait dans les signaux de disponibilité.

Nouveau test : la liste des hooks renvoyant `isLoading: false` **en dur** est
dérivée du source de `dataLayer.ts` (**19 hooks**) ; toute page ou composant qui
garde un verdict vide sur un tel alias, sans signal fort
(`isPowerSyncReadyNow`, `replicaPending`, `Loaded`, `listError`, …), est signalé.
Gère l'alias explicite (`isLoading: x`) **et** la destructuration courte
(`isLoading`).

## Preuves

- `npx tsc -b --force --noEmit` → **0 erreur**
- `npx eslint` (fichiers touchés) → **0 erreur**
- `npx vitest run` → **1628/1628** (136 fichiers)
- **Non-vacuité mesurée** (garde retirée puis restaurée) :
  - R52.o : `1 failed` → restauré `1 passed`
  - R52.p : `1 failed | 1 passed` → restauré `2 passed`
  - garde statique : sonde `__R52Probe.tsx` → `1 failed`, sonde supprimée → `3 passed`

## Cas examinés et écartés (faux positifs documentés)

`AuthPage` (libellé de lien « Pas encore de compte ? »), `Finance` et `FormFill`
(drapeau `loading` **local réel**), `OrgChildren` et `Sessions` (drapeau réel),
`OrgReportsReceived` (isLoading réel + `gatingChecked`).

## Note

Après R52.l→R52.p, le corpus ne présente plus aucun verdict vide gardé par un
`isLoading` mort — vérifié par la garde statique durcie (0 offenseur).
