# Receipt — Phase 11 : R61/P35 — titres de page sémantiques (`<h1>`)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-r61-page-titles`
- **Contrat** : Phase 10 (a11y) / Phase 11 (durcissement) — risque R61, proposition P35.
- **Risque** : R61 — `docs/agent/RISQUES.md`.
- **Proposition** : P35 — `docs/agent/PROPOSITIONS.md`.

## Défaut visé

`TopHeader` rend le titre de page dans un `<p>` stylé, pas dans un `<h1>`. Les
pages qui n'ont pas d'autre titre n'exposent donc **aucun titre de niveau 1** :
ni repère de navigation par titres, ni structure pour les lecteurs d'écran
(WCAG 2.4.1). R61 n'avait été corrigé (session 4) que pour `/groups/:id`.

Un `<h1>` global dans `TopHeader` est **exclu** : il créerait un doublon sur les
pages qui en ont déjà un.

## Mesure (avant)

Scan identique à la garde d'inventaire (`src/ionic/routes/*.tsx` → composants
montés → source de page) :

| Mesure | Avant |
|---|---|
| Écrans montés par le routeur | **62** |
| Écrans sans `<h1>` (ni `SettingsShell`) | **24** |

Les 24 : `CentralAdmin, EventEdit, EventNew, Federation, FormFill,
FormSubmissions, GroupCotisation, History, InvitationEmit, InvitationManage,
MembreDetail, MembresEnAvance, NotFound, OrgReportDetail, OrgReportSend,
OrgReportsReceived, OrgUnits, Reports, SaisieRapide, Sessions, Trace,
TransactionDetail, TransactionNewGroup, Tutorial`.
Quatre d'entre eux (`NotFound`, `FormSubmissions`, `GroupCotisation`,
`InvitationManage`) n'avaient **aucun** titre du tout.

## Correctif

`<h1 className="sr-only">Titre</h1>` inséré juste après chaque `<IonContent>`
de branche, sur les 24 pages — convention déjà utilisée par `Dashboard`,
`Finance`, `GroupDetail`, `TransactionNew`. Les branches d'une même page sont
**mutuellement exclusives** (`return` anticipés vérifiés page par page) : deux
`<h1>` ne sont jamais rendus simultanément. `SettingsShell` (8 écrans
Paramètres) rend déjà son `<h1>`.

## Garde anti-régression

`src/pages/__tests__/screen-states-guard.test.tsx` reçoit un **3e invariant** :
tout composant monté par `<Route>` doit exposer un `<h1>` (direct) ou utiliser
`SettingsShell`. **Preuve de non-vacuité** : avant le correctif, la garde a
listé les 20 pages encore non corrigées (échec explicite), puis est passée au
vert après.

## Preuve (gates)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** |
| Lint | `npx eslint .` | **0 erreur** (warnings préexistants) |
| Tests (suite complète) | `npx vitest run` | **1463/1463** (113 fichiers) |
| Build | `npx vite build` | **OK** |
| Garde ciblée | `screen-states-guard` + `a11y-screens` | **17/17** |

## Effet

Les 62 écrans montés exposent désormais un titre de niveau 1 : navigation par
titres et lecteurs d'écran conformes sur toute l'application. La garde empêche
toute nouvelle page montée d'être ajoutée sans titre.
