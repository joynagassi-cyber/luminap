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
| T10 | Cache `canAccess` invalidé | `V: useCanAccessMulti.test.tsx` | couvert |
| T11 | Contexte d'org réactif | `V` + `C` | couvert |
| T12 | `isInitializingRead()` borné | `V` 1049/1049 | couvert |

## Phases du contrat

| Phase | Feature | Test(s) | Statut |
|---|---|---|---|
| 2 | `resolveRoute` + registre unique | `V: route-resolver.test.ts` (32) | **couvert** |
| 2 | Écrans 404 / forbidden / needs-membership / update-required | `V: route-resolver.test.ts` (outcomes) + `V: useOrgMembership.test.tsx` + `V: needs-membership-escape.test.tsx` (échappatoire R120) + `V: r142-route-permission-wiring.test.ts` | **couvert** — needs-membership **câblé** (R107) + **échappatoire réelle** (R120) ; `forbidden` **câblé** (R142, 2026-10-31) |
| 2 | `data-screen-state` (shell + écrans d'état) | `C: zero-black-screen.cy.ts` (61) + `V: route-registry-drift` (5, dont couverture crawler + matrice deep link) | **couvert** (crawler livré + anti-dérive) |
| 2 | `ErrorBoundary` par route | `LazyRouteErrorBoundary` (pré-existant) | couvert |
| 2 | Watchdog `app-ready` (armé hors React, surcouche statique) | `V: boot-watchdog.test.ts` (4, jsdom) | **couvert** |
| 2 | `ChunkLoadError` rechargement | `V: chunk-error-recovery.test.ts` (3, jsdom) | **couvert** (anti-boucle) |
| 2 | Deep links (web + `appUrlOpen`) | `V: route-resolver.test.ts` (`parseDeepLink`, 7) | **couvert** (parsing) |
| 2 | `client_errors` capture + redaction PII | `V: client-errors.test.ts` (8) | **couvert** |
| 3 | Arbre multi-org : anti-cycle + clôture transitive | `V: org-tree.test.ts` (11) + preuves SQL | **couvert** |
| 3 | Table de fermeture matérialisée (perf) | — | proposition |
| 4 | RBAC décision unique DB↔TS | `V: permissions.test.ts` (19, dont garde registre↔matrice R105) + preuves SQL | **couvert** |
| 4 | RLS réécrites sur `has_permission` | — | proposition (PR18) |
| 5 | Auth parcours complets | `C: auth-real.cy.ts`, `sessions.cy.ts` | partiel |
| 6 | Invitations (code/QR/lien) | `C: invitations.cy.ts`, `V: invitation-rls-hardening`, `invitation-code-entropy`, `sync-config-invitations` | partiel (E1) |
| 7 | Finance transactions | `C: finance-deep.cy.ts`, `V: migration-notify-transaction` | partiel (R101/R102 corrigés) |
| 8 | Isolation RLS | `SQL` + `C: cross-tenant.cy.ts` | partiel (E1) |
| 8 | Invariant « RLS + ≥1 politique par table » (audit exécutable CI) | `V: rls-inventory.test.ts` (4) + `docs/agent/rls-inventory.json` | **couvert** |
| 8 | Surface RPC : aucune fonction de trigger `SECURITY DEFINER` exposée + garde R103 (`pg_trigger_depth`) | `V: revoke-trigger-functions.test.ts` (4) + `settle-claim-rpc-hardening.test.ts` (4) + preuves SQL | **couvert** (R115) |
| 8 | Escalade RPC (`settle_invitation_claim`) | `V: settle-claim-rpc-hardening` (4) + preuve SQL | **couvert** |
| 8 | Entrées hostiles : injection formule CSV | `V: csv-escape` (7) | **couvert** |
| 9 | Sync hors-ligne | `C: cloud-sync.cy.ts` (bloqué env.) | **bloqué (E2)** |
| 10 | Responsive / a11y | `C: responsive-skeleton.cy.ts` + `V: responsive-container-guard.test.tsx` | **couvert** (garde statique ; E2E en CI) |
| 10 | Responsive (contenu borné/centré, grand viewport ; R119) | `V: responsive-container-guard.test.tsx` (3 : 62 pages montées) | **couvert** |
| 11 | Pre-mortem / chaos | à créer | **non couvert** |
| 11 | Page « État du système » (santé) + « Signaler un problème » | `V: health.test.ts` (15) + `C: zero-black-screen` (route) | **couvert** |
| 11 | « Signaler un problème » — envoi du diagnostic (PR5) | V: report-problem.test.ts | couvert |
| 11 | Drapeaux de fonctionnalités (kill switches, PR7/R118) | `V: feature-flags.test.ts` (16 : fail-open, désactivation, surcharge locale, câblage) | **couvert** |
| 12 | Crawler zéro écran noir | `C: zero-black-screen.cy.ts` (toutes routes × état marqué) | **couvert** (hors-cloud) |
| 13 | Tutoriel | à créer (C) | **non couvert** |
| 14 | Personnalisation profil/org | à créer (C) | **non couvert** |
| 10 | Anti double-soumission (actions financières) | `V: useSubmitGuard.test.tsx` (3, jsdom) | **couvert** (TransactionDetail ; autres écrans à étendre) |
| 9 | Erreur de sync VISIBLE (uploadError/downloadError → pill) | `V: powersync-indicator.test.ts` (3, jsdom) | **couvert** |
| 5 | Purge des données locales au changement de compte (PM18) | `V: local-data-ownership.test.ts` (4, jsdom) | **couvert** |
| 2 | Deep link inter-organisation → bascule confirmée (PM2) | `V: deeplink-org-switch.test.ts` (6, jsdom) | **couvert** |
| 7 | Brouillon de saisie longue (PM7) | `V: useFormDraft.test.tsx` (6, jsdom) | **couvert** |
| 4 | Invariant ≥1 administrateur par organisation (PM5) | `V: last-org-admin.test.ts` (4) + `SQL: 20261026000007` | **couvert** |
| 7 | Suppression de membre sans perte financière (PM8) | `V: member-deletion-guard.test.ts` (4) + `SQL: 20261026000008` | **couvert** |
| 9 | Catégories canoniques (R89.a, FK `transactions.category_id`) | `V: canonical-categories-drift` (4) + seed idempotent | **couvert** (FK vérifiée en base) |
| 11 | « Pas encore lu » ≠ « vide » (R52.b→R52.k) : squelettes + garde `isPowerSyncReadyNow()` / drapeaux `*Loaded` | `V: list-loading-vs-empty.test.tsx` (15), `V: r52k-forms-loading.test.tsx` (3), `V: Giving-loading`, `V: async-loading-vs-empty` | **couvert** (non-vacuité vérifiée) |
| 11 | Garde statique anti-récurrence R52 (verdict vide ⇒ signal de disponibilité) | `V: r52-readiness-guard.test.ts` (2, dont non-vacuité par sonde) | **couvert** |
| 11 | `/dashboard` : état vide ≠ pas encore lu (R52.l, branche `isLoading` morte) | `V: r52l-dashboard-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | Listes principales `/members`, `/events`, `/groups`, `/cotisations`, `/notifications` (R52.m) | `V: list-loading-vs-empty.test.tsx` (5, non-vacuité vérifiée) | **couvert** |
| 11 | Détail `/group/:id` : « introuvable » avant lecture (R52.n) | `V: list-loading-vs-empty.test.tsx` (1, non-vacuité vérifiée) | **couvert** |
| 11 | `/reports` : « Aucun rapport personnalisé » avant lecture (R52.o) | `V: r52o-reports-loading.test.tsx` (1, non-vacuité vérifiée) | **couvert** |
| 11 | `DocumentPicker` : « Aucun document uploadé » avant lecture (R52.p) | `V: r52p-document-picker-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | Garde statique : verdict vide gardé par un `isLoading` MORT (liste dérivée de dataLayer) | `V: r52-readiness-guard.test.ts` (3, sonde de non-vacuité) | **couvert** |
| 11 | `/balance`, `/history`, `/versement` : chiffres faux avant lecture (R52.q) | `V: r52q-finance-loading.test.tsx` (6, non-vacuité vérifiée) | **couvert** |
| 11 | Garde statique : squelette gardé par un `isLoading` MORT sans disponibilité prouvée | `V: r52-readiness-guard.test.ts` (4, mutation de Balance.tsx) | **couvert** |
| 11 | `/settings/notifications` : « Tout est lu » avant lecture (R52.r) | `V: r52r-settings-notifications-loading.test.tsx` (2, non-vacuité vérifiée) | **couvert** |
| 11 | `/event/:id/edit` : « Chargement... » infini + nom non pré-rempli (R52.s) | `V: r52s-eventedit-loading.test.tsx` (3, non-vacuité vérifiée) | **couvert** |
| 11 | `/transaction/:id/edit` : formulaire vide en `ready` avant lecture (R52.t) | `V: r52t-transactionedit-loading.test.tsx` (3, non-vacuité vérifiée) | **couvert** |
