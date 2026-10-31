# Receipt — PR11 : Recherche globale

- **Phase** : 11 (fonctionnalité produit)
- **Priorité** : P3 (productivité)
- **Branche** : `agent/pr11-global-search`
- **Date** : 2026-10-31
- **Contrat** : `docs/agent/PROPOSALS.md` PR11

## Valeur

Retrouver **n'importe quel enregistrement** (membre, groupe, événement, mouvement
financier, document, formulaire) depuis un seul endroit, sans naviguer écran par
écran. Aucun index serveur : l'index est construit **en mémoire** sur les données
déjà synchronisées par PowerSync — la recherche fonctionne donc **hors ligne** et
ne transmet rien à l'extérieur.

## Livré

1. **Cœur pur** `src/lib/globalSearch.ts` (aucun React, aucun I/O) :
   - `normalizeText` : minuscules + **repli des accents** (`é→e`, `ç→c`…, NFD +
     suppression des diacritiques) + espaces réduits → « ecole » trouve « École » ;
   - `scoreMatch` : classement **exact (3) > préfixe (2) > sous-chaîne (1)** ;
   - `searchRecords` : tri décroissant (titre pondéré ×10, puis sous-titre),
     **départage par récence** (`date`), puis titre/id (ordre stable), résultat
     **borné** (`DEFAULT_SEARCH_LIMIT = 20`) ; requête vide → **aucun résultat**
     (état neutre, jamais un verdict) ;
   - `toSearchRecords` : adapte les collections du data layer (PowerSync
     `snake_case` ET repli local `camelCase`) en `{ kind, id, title, subtitle,
     score, route }` porteurs d'un **lien profond** vers la fiche.
2. **Hook** `src/hooks/useGlobalSearch.ts` : lit `useMembers`/`useGroups`/
   `useEvents`/`useTransactions`/`useDocuments` + `listFormDefinitionsPS` (comme
   `useBackupData`), puis appelle le cœur pur. **R52** : renvoie `ready:false`
   tant que `isPowerSyncReadyNow()` est faux. Erreur de lecture des formulaires
   instrumentée via `captureClientError` (jamais avalée).
3. **Page** `src/pages/Search.tsx` (`/search`) : squelette avant lecture (jamais
   de faux « Aucun résultat »), état neutre sur requête vide, liste de résultats
   cliquables (badge de catégorie, navigation vers `route`).
4. **Affordance visible** : icône loupe dans `src/components/TopHeader.tsx`
   (présente sur toutes les pages) → `/search`. Gated par le kill switch
   `global-search` (`featureFlags`, **fail-open**).
5. **Route câblée partout** : `src/ionic/routes/core.tsx` +
   `ROUTE_REGISTRY` (`src/lib/routeResolver.ts`) +
   `docs/agent/deeplinks.matrix.json` (`routes_total` 65 → 66) +
   `cypress/e2e/zero-black-screen.cy.ts`.

Aucune nouvelle table, aucune migration : le contrat demandait explicitement un
index **en mémoire** sur les données déjà synchronisées.

## Preuves

- `src/lib/__tests__/global-search.test.ts` : **13 tests** (normalisation,
  classement des 3 niveaux, ordre exact>préfixe>sous-chaîne, récence, borne,
  requête vide, adaptation snake_case/camelCase + liens profonds).
- `src/pages/__tests__/Search.test.tsx` : **5 tests** (R52 squelette avant
  lecture + pas de « Aucun résultat » ; requête vide ≠ branche « pas prêt » ;
  résultats affichés ; clic → `/membre/m1` ; aucune correspondance →
  « Aucun résultat »).
- `src/components/__tests__/core-components.test.tsx` : +1 test (loupe →
  `/search`).
- Gardes de routes vertes : `route-registry-drift.test.ts`,
  `route-resolver.test.ts`, `route-reachability-guard.test.ts`,
  `screen-states-guard.test.tsx`, `a11y-screens.test.tsx`,
  `r142-route-permission-wiring.test.ts`.

**Non-vacuité vérifiée (5 mutations, source restaurée après chacune)** :
1. retirer le repli d'accents → **5/13** échecs ;
2. inverser le tri (`a.score - b.score`) → **2/13** échecs ;
3. retirer le `.slice(0, limit)` → **1/13** échec (borne) ;
4. `replicaPending = false` dans `Search.tsx` → **1/5** échec (squelette R52) ;
5. `onClick` mort sur un résultat → **1/5** échec (navigation).

## Portes

- `npx tsc -b --force --noEmit` → **0 erreur**
- `npm run lint` → **0 erreur** (1744 warnings préexistants inchangés)
- `npx vitest run` → **1814 passés / 6 ignorés**, 170 fichiers
- `npm run build` → **OK** ; `perf-budget.test.ts` → **7/7** (poids du premier
  rendu dans le budget)

## Fichiers

- `src/lib/globalSearch.ts` (nouveau)
- `src/hooks/useGlobalSearch.ts` (nouveau)
- `src/pages/Search.tsx` (nouveau)
- `src/ionic/routes/core.tsx`
- `src/lib/routeResolver.ts`
- `src/components/TopHeader.tsx`
- `src/pages/Tutorial.tsx` (section Phase 13 « Recherche globale », ajoutée en fin de liste)
- `docs/agent/deeplinks.matrix.json`
- `cypress/e2e/zero-black-screen.cy.ts`
- `src/lib/__tests__/global-search.test.ts` (nouveau)
- `src/pages/__tests__/Search.test.tsx` (nouveau)
- `src/components/__tests__/core-components.test.tsx` (+1 test)
- `src/pages/__tests__/Tutorial.test.tsx` (seuils de verrouillage mis à jour : 21/85/75/13)
- `docs/agent/COVERAGE_MATRIX.md` (1 ligne)
- `docs/agent/PROGRESS.md` (1 ligne)
