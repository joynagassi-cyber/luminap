# Receipt — Phase 2 : garde de couverture du crawler « zéro écran noir »

- **Date** : 2026-10-26
- **Branche** : `agent/phase-02-crawler-coverage`
- **Défaut visé** (classe « filet déclaré, jamais déclenché ») : le crawler E2E
  `cypress/e2e/zero-black-screen.cy.ts` embarque une **copie** de `ROUTE_REGISTRY`
  (son bloc `const ROUTES`). Rien ne garantissait que cette copie reste complète :
  ajouter une route au registre sans l'ajouter au crawler faisait **silencieusement**
  cesser la couverture de l'invariant « aucune route ne laisse un écran noir » —
  exactement le type de régression que ce crawler est censé attraper.

## Mesure (avant)

- `ROUTE_REGISTRY` : **61** routes concrètes (hors catch-all `*`).
- Bloc `ROUTES` du crawler : **61** entrées — **identiques** aujourd'hui, mais
  **aucun test** ne l'imposait (dérive possible à chaque nouvelle route).

## Livré

- `src/lib/__tests__/route-registry-drift.test.ts` : +1 test qui lit le spec
  Cypress et vérifie que son bloc `ROUTES` **égale exactement** les patterns de
  `ROUTE_REGISTRY` (hors `*`). Toute route ajoutée/retirée d'un côté sans l'autre
  fait échouer la CI (bloquante, sans identifiants).

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (route-registry-drift) | **4/4** |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |
