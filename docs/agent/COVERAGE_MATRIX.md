# COVERAGE_MATRIX — couverture feature × test

> Chaque ligne pointe vers **au moins un test vert** (V = vitest, C = Cypress,
> SQL = requête d'audit). Une feature sans test = ligne rouge.
> Mis à jour à chaque cycle.

## Correctifs transverses (baseline 2026-10-22→24)

| # | Feature / correctif | Test(s) | Statut |
|---|---|---|---|
| T1 | `PowerSyncProvider` monté | `C: members.cy.ts` | couvert |
| T2 | `usePowerSyncStatus` (registerListener) | `V` + sonde | couvert |
| T3 | Client Supabase B en mémoire seule | trace token | couvert |
| T4 | `cy.session()` (isolation Cypress 16) | `C: invitations.cy.ts` | couvert |
| T5 | `slot="input"` retiré (61 champs) | sonde DOM | couvert |
| T6 | `scroll-padding-top` (header) | `C: finance-deep.cy.ts` | couvert |
| T9 | `lumina-user` persisté | `V` + sonde | couvert |
| T10 | Cache `canAccess` invalidé | `V: useCanAccessMulti` | couvert |
| T11 | Contexte d'org réactif | `V` + `C` | couvert |
| T12 | `isInitializingRead()` borné | `V` 1049/1049 | couvert |

## Phases du contrat

| Phase | Feature | Test(s) | Statut |
|---|---|---|---|
| 2 | `resolveRoute` + registre unique | `V: route-resolver.test.ts` (32) | **couvert** |
| 2 | Écrans 404 / forbidden / needs-membership / update-required | `V: route-resolver.test.ts` (outcomes) | **couvert** |
| 2 | `data-screen-state` | `V` (présence marqueur) | partiel (crawler C à venir) |
| 2 | `ErrorBoundary` par route | `LazyRouteErrorBoundary` (pré-existant) | couvert |
| 2 | Watchdog `app-ready` | `AppReadyBridge` | partiel (pas de test d'intégration) |
| 2 | `ChunkLoadError` rechargement | `installChunkErrorRecovery` | partiel (C chaos à venir) |
| 2 | Deep links (web + `appUrlOpen`) | `V: parseDeepLink` (7) | **couvert** (parsing) |
| 2 | `client_errors` capture + redaction PII | `V: client-errors.test.ts` (8) | **couvert** |
| 3 | Arbre multi-org : anti-cycle + clôture transitive | `V: org-tree.test.ts` (11) + preuves SQL | **couvert** |
| 3 | Table de fermeture matérialisée (perf) | — | proposition |
| 4 | RBAC décision unique DB↔TS | `V: permissions.test.ts` (17) + preuves SQL | **couvert** |
| 4 | RLS réécrites sur `has_permission` | — | proposition (PR18) |
| 5 | Auth parcours complets | `C: auth-real.cy.ts`, `sessions.cy.ts` | partiel |
| 6 | Invitations (code/QR/lien) | `C: invitations.cy.ts`, `V: invitation-rls-hardening` | partiel |
| 7 | Finance transactions | `C: finance-deep.cy.ts` | partiel |
| 8 | Isolation RLS | `SQL` + `C: cross-tenant.cy.ts` | partiel |
| 9 | Sync hors-ligne | `C: cloud-sync.cy.ts` (bloqué env.) | **bloqué (E2)** |
| 10 | Responsive / a11y | `C: responsive-skeleton.cy.ts` | partiel |
| 11 | Pre-mortem / chaos | à créer | **non couvert** |
| 12 | Crawler zéro écran noir | à créer (C) | **non couvert** |
| 13 | Tutoriel | à créer (C) | **non couvert** |
| 14 | Personnalisation profil/org | à créer (C) | **non couvert** |
