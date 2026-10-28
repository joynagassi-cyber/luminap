# Phase 11 — chaos : résilience du boot à un stockage indisponible

- **Date** : 2026-10-27
- **Branche** : `agent/phase-11-boot-storage-resilience`
- **Priorité** : P2 (robustesse ; prolonge l'objectif P0 « zéro écran noir »)
- **Statut** : terminé (portes vertes, test de mutation prouvé)

## Défaut (chaos de démarrage)

`main.tsx` appelle, **avant tout montage React** :

```ts
armBootWatchdog();
initSentry();
initPowerSync();
applyStoredTheme();      // → persistThemeId() → localStorage.setItem(...)
applyStoredThemeMode();  // → persistThemeMode() → localStorage.setItem(...)
```

Or `persistThemeId` / `persistThemeMode` (`src/ionic/themes.ts`) écrivaient
dans `localStorage` **sans `try/catch`**. Si le stockage est indisponible
(mode privé / navigation privée, quota plein, `SecurityError`), `setItem`
**lève** — l'exception remonte dans `main.tsx` **avant `createRoot(...)`** :
React ne monte jamais. Le watchdog s'affiche après 12 s, mais le boot est cassé.

Même classe de défaut sur le chemin d'authentification : `selectRole`
(`src/lib/dataLayer.ts` et `src/store/useLocalStore.ts`), appelé à chaque
chargement de profil (`AppContext.checkAuth`), écrivait `lumina-session` /
`lumina-role` sans garde → une écriture qui échoue interrompait la
synchronisation du rôle.

## Correctif (minimal, non régressif)

Persistance du thème et de la session en **best-effort** : l'état est appliqué
en mémoire (thème posé sur `document`, rôle dans le store) même si l'écriture
échoue. Aucun changement de comportement quand le stockage fonctionne.

- `src/ionic/themes.ts` : `persistThemeId`, `persistThemeMode` → `try/catch`.
- `src/lib/dataLayer.ts` : `selectRole` → `try/catch` (la session est renvoyée
  même si la persistance échoue).
- `src/store/useLocalStore.ts` : `selectRole` → `try/catch` (le rôle est posé
  en mémoire).

## Preuve

- **Test** `src/lib/__tests__/boot-storage-resilience.test.ts` (5 tests, jsdom) :
  `Storage.prototype.setItem` rendu défaillant ; on vérifie que
  `persistThemeId` / `persistThemeMode` ne lèvent pas, que `applyStoredTheme` /
  `applyStoredThemeMode` **posent quand même** l'accent (`--accent-primary`
  `#FF6B00`) et le mode (`data-theme=dark`), et que `selectRole` pose le rôle.
- **Mutation** (preuve de significativité) : `git stash` du correctif
  `themes.ts` → **4/5 tests rouges** ; correctif restauré → 5/5.
- **Portes** (sur `main` rebasé, `4bd08ba`) : `npx tsc -b --noEmit` = 0 erreur ;
  `eslint` = 0 erreur ; `vitest run` = **1384/1384**.

## Portée / non-objectifs

- Ce n'est **pas** une refonte de la couche de stockage : les autres accès
  `localStorage` de l'application sont déjà gardés (vérifié : `onboardingState`,
  `features`, `orgContext`, `useFormDraft`, `auth`, `SettingsProfile`,
  `Sessions`, `DashboardOnboarding`).
- Le déploiement PowerSync (E1) et la suite Cypress (E2/R98) restent hors
  périmètre (escalades ouvertes).
