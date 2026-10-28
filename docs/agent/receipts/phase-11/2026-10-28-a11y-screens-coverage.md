# Receipt — Phase 11 : étendre le banc a11y rendu (6 → 8 écrans)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-11-a11y-screens-coverage`
- **Origine** : écart documenté du receipt Phase 10 — le banc a11y rendu ne
  couvrait que 6 écrans prioritaires sur les 62 montés.

## Défaut visé

`src/pages/__tests__/a11y-screens.test.tsx` vérifie, pour chaque écran **rendu**
(en jsdom) : `data-screen-state` valide, présence d'un `<h1>`, `label` sur les
champs, `aria-label` sur les boutons icône, `alt` sur les images. Six écrans
seulement étaient couverts (`/splash`, `/auth`, `/dashboard`, `/members`,
`/finance`, `/forms`). Les autres dépendaient d'une inspection statique.

## Correctif

Ajout de **2 écrans** au banc : `/help` et `/notifications` — tous deux
rendables avec les mocks déjà en place (ajout d'une seule méthode au mock
`authService` : `hydrateProfile`, utilisée par `Sessions`).

`/sessions` a été **essayé puis retiré** : sans organisation (`useMyOrgs`
mocké sur `[]`), l'écran affiche son état `empty`, pas `ready` — il ne peut
donc pas être validé par ce banc d'états `ready` sans mocker le contexte
d'organisation (hors périmètre).

## Preuve (gates)

| Gate | Commande | Sortie |
|---|---|---|
| Tests ciblés | `vitest run a11y-screens` | **13/13** (avant : 11) |
| Typecheck | `tsc -b --noEmit` | **0** |
| Lint | `eslint .` | **0 erreur** |
| Tests (suite complète) | `vitest run` | **1465/1465** (113 fichiers) |

## Effet

Deux écrans supplémentaires (Aide, Notifications) voient leurs invariants
d'accessibilité vérifiés à l'exécution plutôt que par lecture de source.
