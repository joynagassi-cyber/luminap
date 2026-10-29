# Phase 12 — Suite Cypress exécutée EN LOCAL (capacité débloquée) + mesure

- **Date** : 2026-10-29
- **Branche** : `agent/phase-12-cypress-local`
- **Priorité** : P2 (débloque la validation E2E P0)

## Objectif

La Phase 12 (« suite Cypress + crawler ») était marquée **à faire**, et le
dépôt affirmait (docs + mémoire) que **Cypress ne peut pas tourner en local**.
Objectif : vérifier cette affirmation et, si elle est fausse, exécuter la suite.

## Ce qui manquait (mesuré)

| Prérequis | État initial | Action |
|---|---|---|
| `xvfb-run` / `Xvfb` | **absent** (`dpkg -l | grep xvfb` = 0) | `sudo apt-get install -y xvfb` |
| Binaire Cypress | **absent** (`~/.cache/Cypress/16.0.0/Cypress` manquant) | `node node_modules/cypress/bin/cypress install` |
| Serveur de base | à démarrer à part | `node node_modules/vite/bin/vite.js --port 8080` |

L'affirmation « non exécutable en local » était donc **fausse** : il manquait
seulement ces deux dépendances.

## Résultat — suite complète

**30 specs, 139 tests, 113 passing / 21 failing** (13 specs rouges), 40 min.

### Specs vertes (17)

`zero-black-screen` **64/64**, `auth-real` 5/5, `cloud-sync` 1/1,
`invitations`, `invitations-rls` 4/4, `rls-isolation-hardened` 4/4,
`rls-leak` 1/1, `rbac-gates` 2/2, `forms-fields` 4/4, `local-dashboard` 2/2,
`local-smoke` 3/3, `nav-bottom` 3/3, `responsive-skeleton` 4/4,
`root-redirect` 2/2, `simple-check` 1/1, `theme-modes` 3/3,
`offline-write-sync` 1/1.

### Specs rouges (13)

`calendar`, `comprehensive-flow`, `cross-tenant`, `events-tasks`,
`finance-deep` (4/5), `forms-v2`, `groups-events`, `members` (1/3),
`org-reports`, `performance-batch`, `persistence`, `reports-budgets` (3/5),
`sessions`.

## Interprétation (par la mesure)

1. **17/21 échecs = `Timed out retrying`** sur une donnée créée non relue ;
   **2 = `expected 0 to be at least N`** (`performance-batch` : 0 ligne atteint
   le serveur). Signature = **couche de données**, pas de rendu.
2. **Mêmes specs rouges qu'en CI** (10/13 en commun) → **ce n'est pas la CI**,
   et l'hypothèse « parallélisation » est définitivement écartée.
3. `cloud-sync` **passe** (écriture hors-ligne → Supabase après reconnexion,
   63 s) → la synchronisation **fonctionne** ; le vidage de file d'upload EST
   testable en local.
4. Le crawler P0 passe **64/64** → **aucun écran noir** sur les 64 routes, y
   compris quand les données manquent (squelette `loading` accepté).
5. `/balance` (`finance-deep`) : la page **rend** bien `h1 « Bilan financier »`
   quand `data-screen-state="ready"` — l'échec vient de l'absence de données,
   **pas d'un bug produit**.

## Livrables

- `docs/agent/RUNBOOK.md` : section « Exécuter la suite Cypress EN LOCAL »
  (procédure + résultat de référence).
- `docs/agent/RISQUES.md` : R98 — « MESURE LOCALE (2026-10-29) ».
- `docs/agent/PROGRESS.md` : Phase 12 passée de « à faire » à « débloqué ».

## Risque résiduel

- Les 13 specs rouges restent rouges : cause **couche de données** (déjà
  circonscrite R53/R83/R72/R54). Aucune régression produit introduite.
- La capacité de run local dépend d'une installation manuelle (Xvfb + binaire) :
  à reproduire via le RUNBOOK.
