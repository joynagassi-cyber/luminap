# Receipt — Phase 17 : R116 — la garde de budget de perf était muette en CI

- **Date** : 2026-10-28
- **Branche** : `agent/phase-17-perf-guard-ci`
- **Risque** : R116 (« filet déclaré, jamais déclenché » — variante CI) → CORRIGÉ.

## Découverte (reconstruction depuis zéro)

Clone propre (`git clone`), `npm install` (pnpm absent du conteneur,
`npm install --legacy-peer-deps` → exit 0), puis `npx vitest run` :
**1466 passed | 6 skipped**. Les 6 « skipped » sont les tests de
`perf-budget.test.ts`, conditionnés par
`describe.skipIf(!existsSync(dist/index.html))`.

En inspectant le job `unit` de `ci.yml` : `pnpm exec vitest run` **sans** étape de
build. Le job `build` est **séparé** et ne partage pas `dist/`. Donc en CI, la
garde de budget de performance était **silencieusement ignorée** (6 tests verts
parce que sautés).

## Correctif

1. `ci.yml` (job `unit`) : étape `pnpm run build` ajoutée **avant** `vitest run`.
2. `perf-budget.test.ts` : test garde-fou explicite — sous `CI`, `dist/index.html`
   doit exister, sinon **échec** (plus de skip muet).

## Preuves (3 cas mesurés)

| Cas | Résultat |
|---|---|
| sans `CI`, sans `dist/` | `1 passed | 6 skipped` (tolérance TDD locale) |
| `CI=1`, sans `dist/` | **échec** : `dist/index.html absent … (R116)` |
| `CI=1`, avec `dist/` (après `vite build`) | **7 passed** |

## Gates

- `npx tsc -b` → 0 ; `npx eslint src/` → 0 erreur ; suite complète verte.
- `CI=1 npx vitest run` (avec build) → tous verts.
