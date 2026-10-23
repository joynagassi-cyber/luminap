# Lumina (luminap) — mémoire projet

Front-first : Vite + React + TypeScript + Ionic, Supabase + PowerSync
directement côté navigateur (plus de `server/`, cf. AGENTS.md).
Docs de session : `docs/agent-session/` (FEATURES, DOMAINE, JOURNAL,
DECISIONS, RISQUES, PROPOSITIONS, RUNBOOK, RAPPORT_FINAL).

## Commandes vérifiées
- Unitaires : `npx vitest run` → 1065/1065 (63 fichiers).
- Types : `npx tsc --noEmit` → 0 erreur.
- E2E : serveur Vite **et** `Xvfb :99` requis ; lancer Cypress **détaché**
  (`setsid nohup … &`) sinon SIGSEGV `exit 139` avec log vide.
- E2E : binaire Cypress dans `/workspace/.cypress-cache` → toujours passer
  `CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache` (sinon « Cypress
  executable not found »).
- E2E : `cypress run --spec` accepte une liste séparée par des virgules.
- Lint : `npx eslint .` doit rester à 0 erreur (les specs Cypress utilisent
  la syntaxe Chai → exception `no-unused-expressions` dans `eslint.config.js`).
- Audit : `pnpm audit --audit-level=critical` → 0 critique (`dompurify`
  surchargé via `pnpm-workspace.yaml`, **pas** `package.json` avec pnpm 11).

## Découvertes structurantes (2026-10-23)
- **La CI était rouge en permanence sur `main`** : job `unit` sans
  `.env.local` (→ `src/lib/auth.ts` lève à l'import), 9 faux positifs lint,
  1 vuln critique `dompurify`. Corrigé ; `CI Pipeline` = 6/6 jobs verts.
- **Le job E2E de `ci.yml` est illusoire** : 1 seul spec en
  `continue-on-error: true`, suite complète skippée sans secret
  `E2E_TEST_EMAIL`. `cypress.yml` et `android-debug.yml` sont rouges à chaque
  push (build Android : namespace manquant dans `@capacitor/storage`).
- **La RLS inter-tenant tient** (vérifié par appels REST avec un compte
  non-admin) : triggers `guard_profile_role_immutable` /
  `guard_profile_role_insert` / `trg_guard_profile_org`. Ne pas conclure à
  une escalade sans rejouer avec un compte **non-admin** (piège du faux
  positif : un admin légitime obtient 200).
- **Cypress 16 `testIsolation`** efface `localStorage` entre chaque `it()` →
  un spec qui se contente de `loginOrgAccount()` perd la session ; utiliser
  `cy.ensureAuth()`.
- `sessions.cy.ts` lit la réplique **locale** PowerSync : sans sync actif, il
  reste rouge même si la base contient les liens (défaut d'environnement).

## Pièges durables
- Pages Ionic restent montées et masquées → utiliser les helpers
  `activePage()` / `activePageShouldContain()` (`cypress/support/view.ts`),
  jamais un `cy.contains` global sur un élément de page.
- Ionic : cliquer l'hôte `ion-select`, l'option vit dans `ion-popover`.
- Cypress : construire les requêtes dans `cy.then()` (exécution synchrone).
- Pile z (App.css M15) : nav 40 < overlays 50 < float 60 < toasts 70.
- `Xvfb`/serveur Vite absents ⇒ Cypress `exit 139` muet (cause n° 1).
