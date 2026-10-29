# Receipt — R134 : gardes statiques vacuelles (filet qui ne garde rien)

- **Date** : 2026-10-29
- **Branche** : `agent/r134-vacuous-guards`
- **Classe** : « filet déclaré, jamais déclenché » — 7e occurrence, variante
  **vacuité**.

## Défaut

Une garde statique qui itère un répertoire/registre puis compare deux ensembles
passe **au vert sans rien vérifier** si l'extraction casse : les deux ensembles
deviennent vides et `expect(x).toEqual([])` est satisfait.

Deux gardes concernées :

1. `src/lib/__tests__/route-registry-drift.test.ts` — garde **P0 « zéro écran
   noir »** : `registeredPaths()` lit `src/ionic/routes/*.tsx`. Répertoire
   renommé ou motif `path="…"` modifié → `registered` vide → `missing`/`drift`
   vides → **la garde protégeant le P0 passerait sans couvrir aucune route**.
2. `src/lib/__tests__/no-cjk-strings.test.ts` (R121) — `walk(SRC)` vide → aucun
   fichier scanné → test vert.

## Correctif

Assertions de **non-vacuité** (seuils < volume réel observé) :

| Garde | Assertion ajoutée | Volume mesuré |
|---|---|---|
| `route-registry-drift` | `registered.size > 50`, `ROUTE_REGISTRY.length > 50` | 65 routes montées, 67 entrées |
| `no-cjk-strings` | `files.length > 100` | plusieurs centaines de fichiers `src/**/*.ts(x)` |

## Balayage (honnêteté R12)

Les autres gardes statiques itérant un répertoire portent **déjà** une garantie
de non-vacuité, vérifiée fichier par fichier :

- `jsonb-inventory` : `expect(declaredJsonbColumns()).toEqual([...10 colonnes…])`
  — contrôle de justesse explicite ;
- `settle-claim-rpc-hardening` : `expect(all).toMatch(...)` — un `all` vide
  **échoue** le `toMatch` ;
- `responsive-container`, `screen-states`, `coverage-matrix`,
  `revoke-trigger-functions`, `member-deletion`, `perf-budget` : portent un
  `toBeGreaterThan` ou comparent à un inventaire/constante non vide.

## Gates (mesurés localement)

| Gate | Commande | Sortie | Extrait |
|---|---|---|---|
| Gardes | `vitest run route-registry-drift no-cjk-strings` | **0** | `Test Files 2 passed` · `Tests 6 passed` |

## Risque résiduel

- Les seuils de non-vacuité sont des **planchers** : si le volume réel chutait
  légitimement sous le seuil, la garde échouerait (signalé, à ajuster) — c'est
  le comportement voulu (mieux un faux positif visible qu'un faux négatif muet).
