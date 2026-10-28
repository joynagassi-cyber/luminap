# Receipt — Phase 10 : responsive (contenu borné / centré, grand viewport)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-10-responsive`
- **Risque** : R119
- **Livrables** : 4 pages corrigées + `src/pages/__tests__/responsive-container-guard.test.tsx`

## Tâche

Le contrat (Phase 10 « responsive ») impose que le contenu reste **centré**
(`max-w-lg mx-auto`) au grand viewport (tablette/desktop), comme le vérifie le
spec Cypress `responsive-skeleton.cy.ts` — lequel ne peut pas tourner ici
(environnement E2E, R98).

## Défaut trouvé

Quatre pages montées par le routeur n'appliquaient **aucune contrainte de
largeur** : `CulteDetail`, `EventDetail`, `TransactionNew`,
`TransactionNewGroup`. Sur tablette/desktop leur contenu s'étalait pleine
largeur, alors que toutes leurs pages sœurs sont centrées.

## Correctif

| Page | Avant | Après |
|---|---|---|
| `TransactionNew` | `px-5 pt-safe-calc pb-safe-calc` | `max-w-lg mx-auto w-full …` |
| `TransactionNewGroup` | `px-5 pt-safe-calc pb-safe-calc` | `max-w-lg mx-auto w-full …` |
| `EventDetail` | `px-5 pb-safe pt-safe` | `max-w-lg mx-auto px-5 …` |
| `CulteDetail` | 4 blocs pleine largeur | enveloppés dans `max-w-lg mx-auto` |

## Garde anti-dérive

`responsive-container-guard.test.tsx` — analogue **statique** du spec Cypress :

- extrait les pages réellement **montées** par le routeur (`LazyRoute` →
  `lazy(() => import("@/pages/…"))`) ;
- échoue si une page montée n'a ni `max-w-* mx-auto`, ni `SettingsShell`, ni
  `maxWidth` ;
- **liste blanche explicite** des 3 pages centrées sans bloc large :
  `Splash`, `NotFound`, `Onboarding` — et un test vérifie que cette liste ne
  référence que des pages réellement montées (pas de dérive silencieuse).

**Non-vacuité prouvée** : retrait du correctif `EventDetail` → échec ciblé
`EventDetail (@/pages/EventDetail)` ; restauré → 3/3.

## Preuve

- `V: responsive-container-guard.test.tsx` — **3** tests, 62 pages montées.
- Gates : `tsc -b` **0**, vitest **1537/1537** (122 fichiers), lint **0 erreur**.

## Limite assumée

Le rendu réel (absence de scroll horizontal, skeleton light/dark) reste vérifié
par le spec Cypress en CI — non exécutable localement (R98/E2).
