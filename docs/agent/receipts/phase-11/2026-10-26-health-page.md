# Receipt — Phase 11 : page « État du système » (santé)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-11-health`
- **Proposition source** : PR4 (« page de santé »), priorité P1
- **Statut** : terminé

## Objectif

Donner au propriétaire et au support une vue « santé » de l'application, sans
accès à Sentry : version, plateforme, réseau, synchronisation PowerSync,
organisation active, dernières erreurs client. Aucune PII affichée (politique
de `clientErrors.ts` respectée).

## Livrables

| Fichier | Rôle |
|---|---|
| `src/lib/health.ts` | cœur pur `buildHealthReport` + `worstLevel` + `collectHealthInputs` + hook `useHealthSnapshot` |
| `src/pages/Health.tsx` | page `/settings/health` (via `SettingsShell`) |
| `src/lib/clientErrors.ts` | buffer mémoire des 20 dernières erreurs (`getRecentErrors`) |
| `src/lib/routeResolver.ts` | entrée `/settings/health` dans `ROUTE_REGISTRY` |
| `src/ionic/routes/system.tsx` | route montée `/settings/health` |
| `src/pages/Settings.tsx` | entrée « État du système » dans le hub |
| `cypress/e2e/zero-black-screen.cy.ts` | route ajoutée au crawler (61 → 62) |
| `src/lib/__tests__/health.test.ts` | 11 tests (cœur pur) |
| `src/lib/__tests__/client-errors.test.ts` | +1 test (buffer) |

## Règles de sévérité

| Contrôle | ok | warn | error |
|---|---|---|---|
| Organisation résolue | oui | — | **non** (bloque l'app) |
| Réseau | en ligne | hors ligne | — |
| Sync PowerSync | connectée+synchro | en attente | — |
| Erreurs récentes | 0 | 1–5 | > 5 |
| Version | présente | inconnue | — |

`overall` = sévérité maximale des contrôles.

## Preuves (gates, toutes vertes)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** (exit 0) |
| Unitaires | `vitest run` | **1225/1225** (81 fichiers) |
| Lint | `eslint .` | **0 erreur** (1730 warnings pré-existants) |
| Build | `vite build` | **OK** (exit 0) |

## Non-couvert (honnêteté)

- Le rendu visuel de la page n'a pas de test unitaire (pas de rendu Ionic ici) :
  la logique est testée via le cœur pur, le montage réel est vérifié par le
  crawler Cypress (`zero-black-screen.cy.ts`, route ajoutée).
- Cypress ne tourne pas en local (binaire non installable) → validation CI.
