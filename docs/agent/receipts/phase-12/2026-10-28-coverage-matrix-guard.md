# Receipt — Phase 12 : garde anti-dérive `COVERAGE_MATRIX` ↔ tests réels

- **Date** : 2026-10-28
- **Branche** : `agent/phase-12-coverage-guard`
- **Objet** : la matrice de couverture ne peut plus citer un test **inexistant**.

## Défaut visé (classe, pas instance)

`docs/agent/COVERAGE_MATRIX.md` est la preuve contractuelle « chaque feature a
≥1 test vert ». Rien ne garantissait que les références `V: <nom>` / `C: <nom>`
désignent un fichier **réel** : une entrée pouvait déclarer une couverture
**fictive** (test supprimé ou mal nommé) sans que la CI s'en aperçoive. C'est la
même classe que R65.b (dérive code↔document, non gardée).

## Pourquoi une garde hors-ligne

- La suite Cypress n'est pas exploitable en CI (R98/E2) et le binaire n'est pas
  installable dans l'environnement de l'agent → on ne peut pas « faire tourner
  la matrice ».
- La dérive redoutée n'est pas « un test échoue » mais « la matrice cite un test
  qui n'existe pas » — entièrement visible dans le dépôt.
- Déterministe, instantané (lecture de fichiers), aucun réseau.

## Correctif

`src/lib/__tests__/coverage-matrix-guard.test.ts` (5 tests) :

- relève toutes les références `V:`, `C:`, `SQL:` de la matrice ;
- résout `V:` contre `src/**/*.test.{ts,tsx}`, `C:` contre `cypress/e2e/*.cy.ts`,
  `SQL:` contre `supabase/migrations/*.sql` ;
- échoue si une référence ne résout vers rien.

## Dérives réelles détectées et corrigées

| Référence (avant) | Problème | Corrigée en |
|---|---|---|
| `V: useCanAccessMulti` | le fichier est `useCanAccessMulti.test.tsx` | `V: useCanAccessMulti.test.tsx` |
| `V: parseDeepLink` | nom de fonction, pas de fichier | `V: route-resolver.test.ts` (`parseDeepLink`) |

## Non-vacuité prouvée

Matrice modifiée temporairement (`V: org-tree.test.ts` →
`V: org-tree-FICTIF.test.ts`) → **1 échec** (`Références vitest introuvables :
org-tree-FICTIF.test.ts`) ; restaurée → **5/5**.

## Gates

- `npx vitest run src/lib/__tests__/coverage-matrix-guard.test.ts` → **5/5**.
- `npx tsc -b` → 0 ; `npx eslint src/` → 0 erreur ; `npx vitest run` → suite
  complète verte.

## Statut de la Phase 12

Le livrable **vérifiable hors-cloud** de la Phase 12 (garde de la matrice) est
livré. La « suite Cypress verte » reste **bloquée par l'environnement E2E**
(R98 / ESCALATIONS E2) — escalade, pas un acquis.
