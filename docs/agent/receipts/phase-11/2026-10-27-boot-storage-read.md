# Phase 11 — chaos : résilience du boot, volet LECTURE du stockage

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-boot-storage-read`
- **Priorité** : P2 (robustesse ; prolonge « zéro écran noir »)
- **Statut** : terminé (portes vertes, mutation prouvée)

## Défaut (bug jumeau du volet écriture, PR #72)

`main.tsx` appelle `applyStoredTheme()` / `applyStoredThemeMode()` **avant le
montage React**. Ceux-ci **lisent** le stockage via `getStoredThemeId()` /
`getStoredThemeMode()`, qui appelaient `localStorage.getItem` **sans garde**.
Un stockage inaccessible (`SecurityError` : mode privé, politique, stockage
désactivé) fait **lever** `getItem` → exception **avant `createRoot(...)`** →
React ne monte jamais → écran noir silencieux.

La PR #72 avait gardé les **écritures** (`setItem`) mais pas les **lectures**
(`getItem`) du même chemin de boot : le défaut restait présent sur le chemin
nominal (une lecture précède toute écriture).

## Correctif (minimal)

Lectures de thème en **best-effort**, avec repli sûr (thème par défaut / mode
`dark`) :

- `src/ionic/themes.ts` : `getStoredThemeId` → `try/catch` → `null` ;
  `getStoredThemeMode` → `try/catch` → `"dark"`.

## Preuve

- Test étendu `src/lib/__tests__/boot-storage-resilience.test.ts` : +4 tests
  (9 au total) — `Storage.prototype.getItem` rendu défaillant ; on vérifie que
  `getStoredThemeId` → `null`, `getStoredThemeMode` → `"dark"`, et que
  `applyStoredTheme` / `applyStoredThemeMode` **n'interrompent pas le boot** et
  appliquent quand même le thème (`--accent-primary` `#FF6B00`) et `dark`.
- **Mutation** : gardes de lecture retirées → **4/9 rouges** ; restaurées → 9/9.
- **Portes** (base `main` `d196373`) : `tsc -b --noEmit` **0**, `eslint` **0
  erreur**, `vitest` **1429/1429**.

## Audit de la classe de défaut (JSON corrompu)

Vérification systématique des `JSON.parse` sur le chemin de boot
(`auth.ts`, `onboardingState.ts`, `features.ts`, `dataLayer.ts`,
`organization-context.ts`) : **tous déjà gardés** (`try/catch` ou repli). Le
boot résiste donc aussi au JSON corrompu — aucun changement requis. Le seul
trou restant était la lecture de thème (ci-dessus).

## Portée / non-objectifs

- Pas de refonte du stockage ; correctif ciblé sur le chemin de boot.
- E1 (PowerSync) et E2/R98 (Cypress) restent hors périmètre (escalades).
