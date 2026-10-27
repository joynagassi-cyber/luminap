# Receipt — Phase 2 : deep link inter-organisation (PM2)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-02-org-switch-deeplink`
- **Défaut visé** (pre-mortem PM2, impact **5**, priorité **45**) : `resolveRoute`
  sait produire `org-switch-required` quand un deep link vise une organisation
  différente de l'active — mais **aucun appelant ne passait `linkOrgId`**
  (`grep -rn linkOrgId src/` → seulement la définition dans `routeResolver.ts`).
  La branche était donc **morte** : un lien `?org=B` s'ouvrait dans le contexte
  de A (listes vides / mauvais périmètre). Même classe d'inertie que R105-R108.

## Mesure (avant)

- `grep -rn "linkOrgId" src/` → uniquement `routeResolver.ts` (déclaration +
  comparaison). Aucun site d'appel.
- `RouteGuard` appelait `resolveRoute(path, { isAuthenticated })` sans
  `activeOrgId` ni `linkOrgId` → `org-switch-required` jamais atteint.

## Livré

- `src/lib/deepLinkIntent.ts` (nouveau) — porteur d'intention persistant
  (`sessionStorage`) : `set/get/clearDeepLinkOrgIntent`.
- `src/hooks/useAppUrlOpen.ts` — au traitement d'un deep link non-OAuth, si
  `link.orgId` diffère de l'org active, mémorise l'intention **avant** de
  naviguer (le listener natif est hors React, d'où la persistance).
- `src/App.tsx` (`RouteGuard`) — lit l'intention, alimente `activeOrgId` +
  `linkOrgId` du résolveur, rend `OrgSwitchScreen` sur `org-switch-required`,
  et confirme via `enterOrganization` (qui vérifie l'accès local ; refus →
  accueil, jamais d'écran muet).
- `src/components/RouteStates.tsx` — `OrgSwitchScreen` (confirmation explicite :
  un changement de contexte n'est jamais silencieux).
- `src/lib/__tests__/deeplink-org-switch.test.ts` (6).

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (deeplink-org-switch) | **6/6** |
| `vitest run` (suite) | **1264/1264** (89 fichiers) |
| `npx tsc -b --noEmit` | **0** |
| `eslint` | **0** erreur |

## Reste (assumé)

Le parcours de bout en bout **natif** (app fermée → tap lien → confirmation →
bascule) dépend du pont Capacitor, non exécutable en CI web ; couvert par le
test unitaire de la pièce manquante (intention + décision du résolveur).
