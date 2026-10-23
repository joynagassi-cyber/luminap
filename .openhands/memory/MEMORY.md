# Lumina (luminap) — mémoire projet

Front-first : Vite + React + TypeScript + Ionic, Supabase + PowerSync
directement côté navigateur (plus de `server/`, cf. AGENTS.md).
Docs de session : `docs/agent-session/` (FEATURES, DOMAINE, JOURNAL,
DECISIONS, RISQUES, PROPOSITIONS, RUNBOOK, RAPPORT_FINAL).

## Commandes vérifiées
- Unitaires : `npx vitest run` → 1050/1050 (60 fichiers).
- Types : `npx tsc --noEmit` → 0 erreur.
- E2E : serveur Vite **et** `Xvfb :99` requis ; lancer Cypress **détaché**
  (`setsid nohup … &`) sinon SIGSEGV `exit 139` avec log vide.

## Pièges durables
- Pages Ionic restent montées et masquées → utiliser les helpers
  `activePage()` / `activePageShouldContain()` (`cypress/support/view.ts`),
  jamais un `cy.contains` global sur un élément de page.
- Ionic : cliquer l'hôte `ion-select`, l'option vit dans `ion-popover`.
- Cypress : construire les requêtes dans `cy.then()` (exécution synchrone).
- Pile z (App.css M15) : nav 40 < overlays 50 < float 60 < toasts 70.
- `Xvfb`/serveur Vite absents ⇒ Cypress `exit 139` muet (cause n° 1).
