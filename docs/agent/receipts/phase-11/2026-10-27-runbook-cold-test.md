# Phase 11 — runbook testé à froid (exploitation autonome)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-runbook-cold-test`
- **Priorité** : P2 (exploitation autonome — Phase 11)
- **Statut** : terminé (2 défauts trouvés et corrigés/déclenchés)

## Méthode

Exécuter les commandes du `docs/agent/RUNBOOK.md` **telles qu'écrites**, sur un
environnement neuf, et **confronter le résultat au résultat annoncé**. C'est le
seul moyen de détecter un runbook périmé (un opérateur à froid ne peut pas
juger « ça a marché » sans résultat attendu).

## Ce qui a été testé et le résultat

| Commande du RUNBOOK | Attendu | Obtenu | Verdict |
|---|---|---|---|
| `npx vitest run` | suite verte | **1429/1429 (109 fichiers)** | conforme |
| `npx vitest run --reporter=json` | compte exact | `numTotalTests=1429`, `numFailedTests=0` | conforme |
| `npx tsc --noEmit` (piège documenté) | exit 0 **sans rien vérifier** | exit 0 | conforme (piège réel) |
| `npx tsc -b --noEmit` | exit 0 | exit 0 | conforme |
| `npx eslint .` | 0 erreur | 0 erreur (1748 warnings) | conforme |
| `npm run build` | OK | ✓ built | conforme |
| `npx vite --port 8080` + `curl /` | HTTP 200 | **HTTP 200**, `VITE ready` | conforme |
| `npm ci` (1re commande « Lancer l'app ») | installe | **ÉCHEC ERESOLVE** | **défaut** |
| Requête d'intégrité jsonb | 0 corrompues | **88** (`before_state`) | **défaut** |

## Défaut 1 — `npm ci` échoue (le projet est pnpm)

Le RUNBOOK ouvrait sur `npm ci`. Le projet est **pnpm** : la CI
(`.github/workflows/ci.yml`) exécute `pnpm install --frozen-lockfile`, et
`pnpm-lock.yaml` (23/10) est le lockfile à jour (`package-lock.json` date du
30/09). `npm ci` échoue : `@capacitor/storage@^1.2.5` (peer `@capacitor/core@^3`)
entre en conflit ERESOLVE avec le `@capacitor/core` récent.

**Correctif** : RUNBOOK → `pnpm install --frozen-lockfile` (+ repli
`corepack enable`) et note explicite « ne pas utiliser `npm ci` ».

## Défaut 2 — invariant d'intégrité jsonb violé (88 au lieu de 0)

La requête « doit toujours renvoyer 0 » renvoie **88** sur
`audit_entries.before_state`. Ce sont des chaînes littérales `"null"` (jsonb de
type `string`) : **84 `Invitation` + 4 `FormSubmission`**, toutes en action
`CREATE`, du 2026-10-24 au 2026-10-27. `after_state` = 0 (sain).

**Cause racine** : `src/lib/audit.ts#write` sérialise
`JSON.stringify(fullEntry.beforeState)`. Pour un `CREATE`, `beforeState` vaut
`null` → `JSON.stringify(null)` = la **chaîne** `"null"`, stockée en jsonb de
type string au lieu de `NULL`. Le helper `coerceJsonbValue` (R65) ne normalise
pas ce cas : il ne convertit que les chaînes décodant vers `object`/`array`.

**Traitement** : documenté ici + RUNBOOK ; correctif livré sur une branche
dédiée (`agent/phase-11-jsonb-null-literal`) pour rester « une tâche = une
branche ».

## Preuve honnêteté (R12)

- `[Prouvé]` : tous les résultats du tableau ci-dessus (commandes exécutées,
  sorties citées).
- `[Prouvé]` : la requête jsonb et le détail des 88 lignes (SQL exécuté).
- Le RUNBOOK annonçait des commandes **sans résultats attendus** ; c'était la
  faille qui a masqué les deux défauts. Corrigé : résultats attendus ajoutés.

## Non-objectifs

- E1 (PowerSync) / E2-R98 (Cypress) : hors périmètre.
- Aucune modification applicative dans cette branche (docs + runbook seulement).
