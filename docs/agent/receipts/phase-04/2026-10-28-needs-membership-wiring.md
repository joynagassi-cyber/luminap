# Receipt — Phase 4 : câblage `needs-membership` (R107)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-4-needs-membership`
- **Risque** : R107
- **Livrables** : `src/hooks/useOrgMembership.ts`, `src/hooks/__tests__/useOrgMembership.test.tsx`, exemption `routeResolver.ts`, mise à jour des gardes de câblage.

## Tâche

La branche `needs-membership` du résolveur de routes était **morte** :
`resolveRoute` la produit quand `isOrgMember === false`, mais `App.tsx`
n'alimentait jamais `isOrgMember`. Un compte authentifié mais non membre de
l'organisation active voyait donc une page vide (RLS) au lieu de l'écran
« Organisation non rejointe ».

## Implémentation

`useOrgMembership()` alimente `isOrgMember` dans `App.tsx`. La sûreté repose sur
trois règles :

| Situation | Résultat | Motif |
|---|---|---|
| appartenance trouvée | `member` | preuve définitive |
| aucune ligne **et** base synchronisée | `not-member` | preuve de non-appartenance |
| aucune ligne **et** base pas encore synchronisée | `unknown` | base vide au boot → ne pas bloquer un membre réel |
| org non résolue / utilisateur inconnu | `unknown` | fail-open |

`unknown` → `isOrgMember: undefined` → le résolveur **laisse passer** (fail-open).
La décision est réévaluée au changement d'organisation et à chaque fin de
synchronisation PowerSync.

## Garde anti-régression de flux

`/onboarding` et `/org-setup` sont **exemptés** de `needs-membership` : ce sont
les écrans qui PERMETTENT d'acquérir une appartenance. Les bloquer empêcherait
tout nouvel inscrit de terminer l'onboarding.

## Preuve

| Test | Ce qui est prouvé |
|---|---|
| `useOrgMembership.test.tsx` (6) | fail-open (org non résolue, user inconnu, base non synchronisée), preuve positive, négatif après sync, réévaluation à la fin de sync |
| `route-resolver.test.ts` | exemption `/onboarding` + `/org-setup` ; exemption ciblée ; `undefined` → rendu |
| `route-state-wiring.test.ts` | `isOrgMember` retiré de `PENDING_WIRING` et exigé câblé |

Gates : `tsc -b` **0**, vitest **1546/1546** (123 fichiers), lint **0 erreur**.

## Non couvert (assumé)

`hasPermission` reste non câblé — bloqué par la décision **R109** sur le rôle
ADMIN (propriétaire). Il demeure dans `PENDING_WIRING` avec sa raison.
