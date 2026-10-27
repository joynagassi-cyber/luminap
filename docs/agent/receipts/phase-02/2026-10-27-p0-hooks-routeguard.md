# Receipt — Phase 2 : P0 « l'app ne monte pas » (Rules of Hooks) — R110

- **Date** : 2026-10-27
- **Branche** : `agent/p0-hooks-routeguard`
- **Priorité** : **P0** (écran noir / application non montée)
- **Défaut visé** : `RouteGuard` (`src/App.tsx`) violait les **Rules of Hooks** —
  deux hooks (`useState(orgIntent)` + `useEffect`) étaient déclarés **après** un
  `return` précoce (`if (!isAuthChecked) return <spinner/>`). Au premier rendu
  (auth non vérifiée) ces hooks n'étaient pas appelés ; dès le rendu suivant ils
  l'étaient → `Rendered more hooks than during the previous render` → l'ErrorBoundary
  racine remplaçait **toute** l'application par « Une erreur inattendue s'est produite ».
- **Origine** : introduit par `db4a367` (PR #47, PM2 deep link inter-organisation) —
  le bloc `orgIntent` a été ajouté sous le `return` précoce au lieu d'au-dessus.

## Mesure (avant)

- Dev server réel (`vite` + navigateur) : `/splash` affichait
  « Une erreur inattendue s'est produite » (ErrorBoundary), contenu React vide.
- Console : `React has detected a change in the order of Hooks called by RouteGuard`
  puis `Error: Rendered more hooks than during the previous render` (App.tsx:137).
- `npx eslint` avec `react-hooks/rules-of-hooks: error` → **2 erreurs** :
  - `src/App.tsx` (lignes 97-98, `useState` conditionnels) ;
  - `src/pages/CulteDetail.tsx` (lignes 97-98, même classe : `useState` après `if (!culte)`).
- Cause structurelle : la règle était forcée à `warn` dans `eslint.config.js`,
  donc une violation **fatale au rendu** ne cassait pas la CI.

## Livré

- `src/App.tsx` — hooks `orgIntent` déplacés **au-dessus** du `return` précoce
  (ordre des hooks constant à chaque rendu).
- `src/pages/CulteDetail.tsx` — `useState` (`showMassPay`, `busyRowId`) déplacés
  au-dessus de `if (!culte)`.
- `eslint.config.js` — `react-hooks/rules-of-hooks` passé de `warn` à **`error`**
  (empêche toute récidive) + exception `e2e/**` (faux positif : le `use` des
  fixtures Playwright n'est pas un hook React).
- `src/pages/__tests__/CulteDetail-hooks.test.tsx` — test de non-régression qui
  reproduit la transition « pas de données → données » (le chemin qui plantait).

## Preuve

| Gate | Sortie |
|---|---|
| Navigateur (dev server réel) | `/splash` se monte (logo + skip-link + badge Offline), **plus d'ErrorBoundary** |
| Console après correctif | **0** occurrence de `Rendered more hooks` / `change in the order of Hooks` |
| `npx eslint .` | **0 erreur** (1738 warnings pré-existants) |
| `npx eslint` avec `rules-of-hooks: error` | **0 erreur** (était 2) |
| `npx tsc -b` | **0** (exit 0) |
| `vitest run` | **1347/1347** (101 fichiers) |
| Test de non-régression, **sans** le correctif | **échoue** : `Rendered more hooks than during the previous render` |
| Test de non-régression, **avec** le correctif | **passe** |

## Impact

C'est la cause probable de « l'app ne monte pas » constatée en E2E (Phase 12) :
les sélecteurs `input[type="email"]`, `nav[aria-label]`, `[data-screen-state]`
n'étaient jamais trouvés car React n'affichait que l'écran d'erreur. **Toute**
route authentifiée était inatteignable tant que `isAuthChecked` basculait.

## Reste (assumé)

- Vérification E2E complète via la CI Cypress (non exécutable en local).
- R109 (`ADMIN` DB-only) reste une décision propriétaire, indépendante de ce défaut.
