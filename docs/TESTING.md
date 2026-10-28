# TESTING — Lumina

> Document **dérivé de la configuration et des tests réels**. Chaque affirmation
> renvoie à un fichier du dépôt. Fiabilité marquée : `[Prouvé]` (exécuté/mesuré
> ici), `[Probable]`, `[Non vérifié]`.
>
> Dernière mise à jour : 2026-10-28 (phase 16). Mesures de référence : gates
> exécutés le 2026-10-28 (voir receipt `docs/agent/receipts/phase-16/`).

## 1. Vue d'ensemble

| Niveau | Outil | Portée | Statut |
|---|---|---|---|
| Unitaires / gardes structurelles | **Vitest** | `src/**/__tests__` (node + jsdom) | **Vert** `[Prouvé]` |
| E2E web | **Cypress** | `cypress/e2e/*.cy.ts` (30 specs) | **Non vert sur `main`** (R98 / E2) |
| E2E minimal / mobile | Playwright (`e2e-min`), Maestro (`.maestro`) | parcours ciblés | secondaire |
| Gates bloquants | `tsc -b`, `eslint src/`, `vitest run`, `build` | CI `ci.yml` | bloquants |

## 2. Vitest

### 2.1 Configuration

`vitest.config.ts` `[Prouvé]` :

- `environment: 'node'` par défaut ; `environmentMatchGlobs` bascule en **jsdom**
  pour `src/components/**`, `src/hooks/**`, `src/store/**`. Les fichiers de test
  jsdom hors de ces préfixes portent `// @vitest-environment jsdom` en 1re ligne.
- `pool: 'forks'` + `singleFork: true` — exécution **séquentielle** (25 workers en
  parallèle provoquaient des timeouts, commentaire dans le fichier).
- `setupFiles` : `src/lib/__tests__/setup.ts` (importe `@testing-library/jest-dom`
  et fournit un shim `localStorage` pour jsdom).
- `include` : `src/capabilities/__tests__`, `src/adapters/native/__tests__`,
  `src/lib/__tests__`, `src/components/__tests__`, `src/pages/__tests__`,
  `src/store/__tests__`, `src/hooks/__tests__`, `src/updater/__tests__`.
- `coverage` : seuils 80 % (lignes/fonctions/branches/instructions).

### 2.2 Mesure de référence

`npx vitest run` (2026-10-28) `[Prouvé]` : **114 fichiers passés, 1 ignoré
(115)** ; **1466 tests passés, 6 ignorés (1472)** ; exit 0.

### 2.3 Dépendance à l'environnement

`src/lib/auth.ts` **lève à l'import** si `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` sont absents. Un `.env.local` (gitignoré) est donc requis
pour exécuter la suite en local et en CI (le job `unit` de `ci.yml` crée ce
fichier depuis les secrets). Sans lui, des fichiers échouent au chargement
(`(0 test)`).

## 3. Gardes structurelles (le cœur de la stratégie)

La classe de défaut la plus coûteuse du projet est **« filet déclaré, jamais
déclenché »** : un garde-fou existe dans le code mais aucune donnée ne
l'alimente, ou une source de vérité dérive silencieusement. La stratégie
privilégie donc des **gardes d'inventaire déterministes** (lecture de fichiers,
aucun réseau, aucun secret) qui échouent à la source.

| Garde (fichier) | Invariant verrouillé |
|---|---|
| `src/lib/__tests__/route-state-wiring.test.ts` | Chaque champ de `RouteState` est **alimenté** dans `App.tsx` ou inscrit dans `PENDING_WIRING` (avec id de risque) ; chaque `RouteOutcome` a un `case` rendu. Classe R105/R106/R107/R108/R113. |
| `src/lib/__tests__/route-registry-drift.test.ts` | `ROUTE_REGISTRY` ≡ routes montées dans `src/ionic/routes/*.tsx` ≡ liste du crawler `zero-black-screen.cy.ts` ; exactement un catch-all `*`. |
| `src/lib/__tests__/sync-streams-drift.test.ts` | `ON_DEMAND_STREAMS` (client) ≡ streams `auto_subscribe: false` de `sync-config.yaml`. |
| `src/lib/__tests__/rls-inventory.test.ts` | RLS + ≥1 politique sur **43** tables `public` (sauf deny-all listé). |
| `src/lib/__tests__/revoke-trigger-functions.test.ts` | Aucune fonction de trigger `SECURITY DEFINER` exécutable par anon/authenticated ; garde `pg_trigger_depth()` présente (R115). |
| `src/lib/__tests__/jsonb-inventory.test.ts` | Toute colonne `jsonb` des migrations est couverte par `JSONB_COLUMNS` (R65.b). |
| `src/lib/__tests__/role-model-drift.test.ts` | `PERMISSION_MATRIX` (TS) ≡ migration SQL ≡ `role-model.json` mesuré. |
| `src/pages/__tests__/screen-states-guard.test.tsx` | Tout composant monté expose `data-screen-state` (catalogue fini de `RouteStates.tsx`) **et** un `<h1>` (R61/P35). |
| `src/capabilities/__tests__/no-cross-imports.test.ts` | Pas d'import croisé entre capacités. |
| `src/lib/__tests__/capabilities.test.ts` | Toute permission du modèle canon appartient à ≥1 capacité. |

Principe : ces gardes sont **non-vacues** — elles vérifient aussi qu'elles
testent quelque chose (`expect(tables.length).toBeGreaterThan(30)`, etc.).

## 4. Cypress (E2E web)

- Configuration : `cypress.config.ts` — `baseUrl` = `CYPRESS_BASE_URL` (défaut
  `https://lumina-76un.onrender.com`), `expose` pour les identifiants de test,
  `projectId: 'x3hhna'`. **30 specs** sous `cypress/e2e/` `[Prouvé]`.
- **Statut : suite non verte sur `main`** — risque **R98** / escalade **E2**.
  Cause circonscrite à l'**environnement E2E** (réplique PowerSync vide R53,
  prérequis offline R83, contexte d'org R72), et **non** à la parallélisation
  (hypothèse **réfutée** par mesure en mono-conteneur, run `40080015253`).
- **Repli** : en CI, seul le smoke spec **sans identifiants**
  (`cypress/e2e/simple-check.cy.ts`, render-only) est exécuté, et il est
  `continue-on-error: true` (job `e2e` de `ci.yml`). Les specs **indépendantes de
  PowerSync** restent le signal E2E exploitable.
- Workflows : `.github/workflows/cypress.yml` (record + parallélisation, 2
  conteneurs) et le job `e2e` de `.github/workflows/ci.yml`.

## 5. Gates bloquants

Ce sont les gates **déterministes mesurables localement** (ADR D-P0-2) `[Prouvé]` :

| Gate | Commande | Attendu |
|---|---|---|
| Typecheck | `npx tsc -b` | exit **0** (`tsc -b` construit app + node + cypress ; `tsc --noEmit` racine ne vérifie rien car `files: []`). |
| Lint | `npx eslint src/` | **0 erreur** (warnings pré-existants tolérés). |
| Unitaires | `npx vitest run` | tout passe (exit 0). |
| Build | `pnpm run build` (`vite build`) | exit 0. |

En CI (`.github/workflows/ci.yml`), les jobs `lint`, `typecheck`, `unit`, `build`
sont **bloquants** (`continue-on-error: false`) ; `security` exécute
`pnpm audit --audit-level=critical` (bloquant) et un audit `high` informatif.
Node **22** et pnpm **11.27.1** sont figés.

### 5.1 Résultats mesurés (2026-10-28, phase 16)

| Gate | Sortie |
|---|---|
| `npx tsc -b` | **exit 0** |
| `npx eslint src/` | **0 erreur** (1642 warnings pré-existants) |
| `npx vitest run` | **1466 passés / 6 ignorés**, exit 0 |

## 6. Pattern des *receipts*

Chaque tâche de la boucle d'auto-durcissement produit un **receipt** sous
`docs/agent/receipts/<phase>/<date>-<slug>.md` `[Prouvé]`. Structure observée
(ex. `phase-11/2026-10-28-r65b-jsonb-inventory.md`) :

1. **En-tête** : date, branche, risque visé (id) et statut.
2. **Défaut visé** et **analyse** (cause racine visible dans le dépôt).
3. **Dérive réelle détectée** (le cas échéant).
4. **Correctif** (fichiers/migrations touchés).
5. **Preuve (gates)** : tableau commande → résultat, incluant un test de
   **non-vacuité** (retrait du correctif → échec ; remise → vert).
6. **Effet** (ce qui devient détectable).

Le receipt est le lien de confiance entre l'affirmation d'un `PROGRESS.md` et la
preuve exécutable.

## 7. Ce qui n'est pas couvert (honnêteté)

- **Chemin d'écriture hors-ligne réel** (SQLite → file → Supabase) : couverture
  limitée (cf. R83) ; il repose sur l'environnement E2E, non déterministe.
- **Suite Cypress complète** : non fiable sur `main` (R98) — ne pas s'y fier pour
  détecter une régression.
- **Build Android** : échoue à chaque push (R55, préexistant).
- **RLS et `has_permission`** : les gardes d'inventaire figent l'**état mesuré**,
  pas le comportement runtime ; le comportement réel est vérifié par les specs
  E2E (non bloquantes).

## 8. Renvois

- Architecture → [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Sécurité → [`SECURITY.md`](./SECURITY.md)
- Gates détaillés et runbook → `docs/agent/RUNBOOK.md`
- Escalades (E2 Cypress, E3 sauvegardes) → `docs/agent/ESCALATIONS.md`
- Receipts → `docs/agent/receipts/`
