# Receipt — Phase 2 (P0) : zéro écran noir + deep links

Date : 2026-10-26
Branche : `agent/phase-02-zero-black-screen`

## Périmètre vérifié (déjà livré, sessions antérieures)
| Élément | Emplacement | Statut |
|---|---|---|
| Résolveur de route unique | `src/lib/routeResolver.ts` (`resolveRoute`, `parseDeepLink`) | présent |
| Registre de routes (source de vérité) | `ROUTE_REGISTRY` (62 routes + `*`) | présent |
| Écrans d'état finis | `src/components/RouteStates.tsx` (`data-screen-state`) | présent |
| ErrorBoundary par route + skeleton | `src/ionic/routes/lazy-route.tsx` | présent |
| 404 dédiée | `src/pages/NotFound.tsx` | présent |
| Matrice deep link | `docs/agent/deeplinks.matrix.json` | présent |

## Ce qui manquait (livré ici)
1. **Le shell de route n'exposait pas `data-screen-state`.** Un crawler ne
   pouvait pas prouver « pas d'écran noir » sur une route rendue. Ajouté :
   - `PageSkeleton` → `data-screen-state="loading"`
   - sous-arbre monté → `data-screen-state="ready"`
   - écran d'erreur LazyRoute → `data-screen-state="error"`
2. **Aucune garde anti-dérive** entre `ROUTE_REGISTRY` et les `<Route>` montés.
   Ajouté : `src/lib/__tests__/route-registry-drift.test.ts` (3 tests).
3. **Aucun crawler** « zéro écran noir ». Ajouté :
   `cypress/e2e/zero-black-screen.cy.ts` (61 routes × état marqué).

## Preuves (commandes → code de sortie → extrait)
```
$ npx tsc -b --noEmit            → 0        (aucune erreur)
$ pnpm exec vitest run           → 0        1207/1207 (78 fichiers)
     (dont route-registry-drift : 3 passed ; route-resolver : 32 passed)
$ pnpm run lint                  → 0        0 erreur (1730 warnings préexistants)
$ pnpm run build                 → 0        built in 3.08s
```

## Anti-dérive (extrait mesuré)
```
$ comm -23 <(routes montées) <(ROUTE_REGISTRY)   → (vide)
$ comm -13 <(routes montées) <(ROUTE_REGISTRY)   → (vide)
```
Les 62 routes montées et les 62 entrées du registre coïncident exactement.

## Honnêteté (R12)
- **Prouvé** : résolveur, registre, drift-guard, marqueurs `data-screen-state`
  sur le shell, tsc/vitest/lint/build verts.
- **Probable** : le crawler Cypress (61 cas) passe en CI — non exécutable
  localement (binaire Cypress non installable dans l'agent). La suite E2E est
  structurellement rouge sur `main` (R98) ; ce spec est conçu hors-cloud
  (`cy.interceptCloud` + `seedLocalSession`) pour être l'un des plus stables.
- **Non vérifié** : rendu visuel réel de chaque route (le crawler vérifie la
  présence d'un marqueur d'état, pas la pertinence du contenu).
