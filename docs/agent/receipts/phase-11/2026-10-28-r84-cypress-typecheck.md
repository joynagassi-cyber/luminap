# Receipt — Phase 11 : R84 — la suite Cypress n'est pas typecheckée en CI

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-r84-cypress-typecheck`
- **Contrat** : Phase 11 (pre-mortem / durcissement) + Phase 12 (fiabiliser la
  base de preuves Cypress).
- **Risque** : R84 (faible) — `docs/agent/RISQUES.md`.
- **Proposition** : P34 — `docs/agent/PROPOSITIONS.md`.

## Défaut visé

`tsc -b` (la commande du job CI « TypeScript Check ») ne couvrait que
`tsconfig.app.json` (`include: ["src"]`) et `tsconfig.node.json`. Les 28 specs
Cypress **n'étaient jamais vérifiés statiquement** : une faute de type dans un
spec ne pouvait être détectée qu'à l'exécution — voire jamais si le chemin
concerné n'était pas parcouru. C'est un problème de **fiabilité de la preuve** :
la suite Cypress est le seul mécanisme E2E du projet.

## Mesure (avant)

`npx tsc -p cypress/tsconfig.json --noEmit` → **13 erreurs**, dont 2 de
configuration (`Set` itéré sans `--downlevelIteration`) et 11 de code :

| Fichier | Erreur |
|---|---|
| `support/ionic.ts` | 3 — commandes custom typées `Chainable<null>` mais retournant `cy.wrap(null)`/`cy.get(...)` |
| `e2e/sessions.cy.ts` | 3 — `Window.console` (absent du lib DOM) |
| `e2e/cloud-sync.cy.ts` | 2 — `.value` écrit sur un `HTMLElement` (hôte Ionic) |
| `e2e/invitations-rls.cy.ts`, `e2e/rls-leak.cy.ts` | 2 — `FOREIGN_ORG_IDS` redéclaré (specs globaux sans module) |
| `e2e/nav-bottom.cy.ts` | 1 — type de retour `Chainable<void>` inexact |

## Correctif

1. **Câblage** : `tsconfig.json` référence `./cypress/tsconfig.json`.
   `cypress/tsconfig.json` reçoit `target: ES2020` (résout l'itération de `Set`),
   `composite: true` (requis pour une référence de projet) et **`noEmit: true`**.
2. **`noEmit` est indispensable** : sans lui, `tsc -b` **émet** des artefacts dans
   le dépôt — mesuré : **74 `.js`/`.d.ts` dans `cypress/`** plus un
   `cypress.config.js`/`.d.ts` à la racine. `noEmit` les supprime (vérifié :
   `tsc -b` laisse l'arbre propre).
3. **11 corrections type-only** (aucun effet runtime) : commandes custom en
   `Chainable<void>` + `.then(() => undefined)` ; cast local pour `.value` sur
   l'hôte Ionic ; `Window.console` via un cast local ; `export {}` dans les deux
   specs globaux ; type de retour inféré pour `nav-bottom`.
4. `.gitignore` : ajout de `cypress/tsconfig.tsbuildinfo`.

**Aucun workflow modifié** : `.github/workflows/` exige la permission `workflows`,
absente du jeton de l'agent (403 mesuré). Le job CI existant
(`npx tsc -b --noEmit`) couvre désormais Cypress **par la seule configuration**.

## Preuve

| Contrôle | Résultat |
|---|---|
| `npx tsc -b --noEmit` (commande CI exacte) | **0 erreur** (inclut `cypress/`) |
| `npx tsc -b` puis `git status` | **aucune émission** (arbre propre) |
| `npx eslint cypress/` | **0 erreur** (103 warnings préexistants) |
| `npx vite build` | **OK** |
| Suite unitaire | **1462/1462** |
| Anti-régression | réintroduire une faute de type dans un spec fait **échouer** `tsc -b` |

## Effet

Le verrou est désormais **actif en CI sans intervention du propriétaire** : toute
nouvelle faute de type dans un spec Cypress fait échouer le job « TypeScript
Check ». Cela durcit la Phase 12 (couverture Cypress) : les specs ne peuvent plus
dériver silencieusement.
