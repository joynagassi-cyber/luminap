# Phase 11 — R114 : CI Pipeline rouge sur `main` (test `node:sqlite`, Node 22 vs 24)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-ci-node22-sqlite`
- **Priorité** : P0 (le seul signal de qualité fiable du dépôt était rouge)
- **Statut** : terminé (correctif vérifié sous Node 22 **et** Node 24)

## Défaut

`src/lib/__tests__/org-isolation-intrusion.test.ts` (Phase 8, mergé #73) fait
`import { DatabaseSync } from "node:sqlite"`. Sous **Node 22**, Vite refuse de
bundler ce builtin : `Error: Cannot bundle Node.js built-in "node:sqlite"`.
Le job **Unit Tests (Vitest)** de la CI Pipeline échouait donc **sur `main`**
(run `40612896922`, commit `8dd6908`).

## Impact (pourquoi c'est P0)

La CI Pipeline était **la seule vérification fiable** du dépôt : Cypress est
structurellement rouge (R98) et Android échoue (R90). Avec la CI Pipeline
rouge, **aucune régression n'était plus détectable** par l'automatisation, et
chaque PR héritait d'un rouge pré-existant.

## Cause racine (mesurée)

**Désalignement de version Node** : tous les workflows GitHub Actions fixent
`NODE_VERSION: '22'` ; le poste de développement a Node **24**.

Sous Node 22.20, `node:sqlite` **existe** (`require('node:sqlite')` fonctionne)
mais n'est **pas** listé dans `module.builtinModules` — Vite ne l'externalise
donc pas. Sous Node 24, il l'est.

## Reproduction déterministe

| Node | `vitest run src/lib/__tests__/org-isolation-intrusion.test.ts` |
|---|---|
| 22.20.0 | `FAIL … Cannot bundle Node.js built-in "node:sqlite"` |
| 24.21.0 | **15/15** |

## Correctif

Résoudre le builtin **à l'exécution** au lieu de l'importer statiquement :

```ts
import type { DatabaseSync } from "node:sqlite"; // effacé au build
const { DatabaseSync: SqliteDatabase } = process.getBuiltinModule("node:sqlite");
```

`process.getBuiltinModule` est disponible sur Node 22.20 **et** 24 (vérifié) ;
Vite ne tente pas de bundler un appel dynamique. Aucun autre fichier du dépôt
n'importe `node:sqlite` (vérifié par `grep`).

## Preuve après

- `vitest run` **sous Node 22** : 112 fichiers, **1452 tests, 0 échec**.
- `vitest run` **sous Node 24** : 112 fichiers, 1452 tests, 0 échec.
- `tsc -b --noEmit` : **0**. `eslint` : **0 erreur** (6 warnings pré-existants).

## Honnêteté (R12)

- `[Prouvé]` : reproduction locale sous les deux versions Node (sortie brute).
- `[Prouvé]` : la suite complète passe sous Node 22 après correctif.
- `[Probable]` : la CI sera verte — vérification par le run CI de la branche
  (le run `main` est rouge à cause du même défaut, cf. R114).

## Suivi

- La cause de fond (désalignement Node 22 CI vs 24 dev) est un piège à
  consigner : tout test utilisant un builtin expérimental Node 24-only échoue
  silencieusement en CI. Recommandation : aligner `NODE_VERSION` ou documenter
  la contrainte.
