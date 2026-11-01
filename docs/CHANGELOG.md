# CHANGELOG

All notable changes to the Lumina Platform will be documented in this file.

---

## [Unreleased]

### Added
- **Observabilité → GitHub Issues (correction autonome)** — chaîne complète
  `erreur client → Issue GitHub` labellisée `openhands`, que l'automatisation
  cloud OpenHands détecte et corrige sans intervention.
  - **Capture globale** (`src/lib/observability/`) : `onerror` /
    `unhandledrejection` (`clientErrors.ts`), ErrorBoundary racine (`App.tsx`)
    et par route (`lazy-route.tsx`), erreurs de synchronisation PowerSync
    (`SupabaseConnector.ts`), tâches longues (`perfMonitor.ts`).
  - **Classification** (crash / functional / database / sync / performance) à
    partir du message, du code d'erreur (PostgREST/SQLSTATE) et de la première
    trame utilisateur.
  - **Rapport contextuel ultra-détaillé** injecté dans l'Issue : stack trace,
    pile de composants React, route active, environnement, version, plateforme,
    état de session (sans identité) et fil d'Ariane des 5 dernières actions.
  - **Anti-spam** : déduplication par signature (client + serveur), fenêtre de
    dédup, plafond par session et file d'attente locale qui survit au
    hors-ligne / rechargement.
  - **Sécurité** : le jeton GitHub n'est JAMAIS côté client — l'edge function
    `report-error` (secret Supabase `GITHUB_TOKEN`) vérifie le JWT appelant,
    valide le dépôt cible contre une allowlist et crée l'Issue. Le dépôt étant
    public, le rapport est expurgé côté client (aucune PII).
  - Le bouton « Signaler un problème » (page Santé) remonte aussi une Issue.
  - **Capture PRÉ-LOGIN (anonyme) rate-limitée** — les incidents survenant
    avant la connexion (crash de l'écran d'auth, échec d'invitation, perte
    réseau au boot) sont désormais remontés : l'edge function n'exige plus de
    JWT (`verify_jwt: false`) et distingue deux voies — authentifiée (plafond
    large, bucket `user:<uuid>`) et anonyme (plafond serré, bucket =
    `sha256(salt+ip)`, IP jamais stockée en clair). La vérification JWT reste
    faite dans la fonction, donc un en-tête forgé retombe sur la voie anonyme.
    Sans `service_role` la voie anonyme est REFUSÉE (jamais non plafonnée).
    Table `error_report_throttle` (deny-all) + RPC `register_anonymous_report`
    (EXECUTE réservé au `service_role`).
  - Gardes : `error-reporter`, `breadcrumbs`, `perf-monitor`,
    `report-error-issue`, `report-error-throttle` et
    `error-to-issue-integration-guard` (statique).

---

## [1.2.1] — 2026-11-01

### Fixed
- **Fuite de données personnelles dans le diagnostic de santé (PR4)** — le
  bouton « Copier le diagnostic » de la page « État du système » recopiait
  verbatim le message d'erreur brut ; il applique désormais `redact()`
  (e-mail, JWT, clé API masqués). Preuve de non-vacuité : le test échoue sans
  le `redact`.
- **Fuite de données personnelles dans « Signaler un problème » (PR5)** — une
  note libre contenant un nom propre ou un numéro de téléphone partait verbatim
  vers Sentry et le journal local. `scrubIdentities()` retire désormais par
  valeur l'e-mail, le prénom et le nom de l'utilisateur courant, dans la note
  comme dans les messages d'erreur repris ; `redact()` masque aussi les numéros
  français.
- **Invariant « pas encore lu » ≠ « vide » sur `/archives` (R52)** — la
  sous-liste « Documents archivés » affichait « Aucun document archivé » avant
  la fin de la première lecture PowerSync. Garde de disponibilité rétablie.
- **Garde de câblage RBAC (PR19)** — `route-state-wiring` vérifiait la présence
  de la clé `hasPermission`, pas sa valeur : `hasPermission: undefined`
  (fail-open silencieux) passait la garde et `tsc`. La garde détecte désormais
  les clés câblées au littéral `undefined`.

### Added
- **Test direct de `useBackupData` (PR2)** — le hook portait deux invariants
  (garde R52 `ready`, cloisonnement à l'organisation active) jamais vérifiés
  (toujours mocké). Test ajouté ; non-vacuité prouvée par mutation.

### Changed
- **Vérification indépendante des filets de robustesse PR1–PR7 / PR19** — trois
  revues croisées (journal d'audit + sauvegarde ; corbeille + santé ;
  signalement + mise-à-jour-requise + kill switches + câblage de route) avec
  preuve de non-vacuité par mutation pour chaque filet.

### Fixed (E2E)
- **Suite Cypress de nouveau verte** — fin de l'id d'organisation `org-e2e`
  figé (résolution dynamique de l'org active, R161 self-serve), reseed
  idempotent des catégories canoniques (intégrité FK), et flush déterministe
  de la file d'upload PowerSync après création d'un formulaire (`forms-v2`).
  10 specs passaient rouges sur `main`, désormais toutes vertes.

---

## [1.2.0] — 2026-11-01

### Added
- **Guide visuel des écrans** — 64 captures annotées (390×844) générées par
  Cypress, intégrées au tutoriel en galerie par section + PDF
  `docs/agent/GUIDE_ECRANS.pdf` (35 pages). Chaîne reproductible via
  `pnpm docs:screens` puis `pnpm docs:visual`.
- **Création d'organisation self-serve (R161)** — un nouvel utilisateur peut
  créer sa propre organisation sans invitation ; fin du cul-de-sac
  « Organisation non rejointe ».
- **Couverture E2E PR4/PR5** — page de santé (état général + relevés) et
  « Signaler un problème » (signalement réellement journalisé, sans PII).

### Changed
- **Autorisation d'écriture durcie (R141 / R141.b / R141.c / R141.d)** — les
  dernières politiques RLS d'écriture sur « membre seul » passent sur les
  permissions canon (`has_permission()`).

### Fixed
- Gardes anti-régression ajoutées : `pr18-write-permission-guard`,
  `r141d-write-permission-guard`, `r141bc-write-permission-guard`.

---

## [Platform Complete] — 2026-09-09

### Summary
The Lumina Platform has reached a stable, production-ready state. All core phases (0-8, 12-13, 21-22, 25) are complete. 574 tests passing, 0 TypeScript errors, 38 Ionic pages, 10 capabilities.

### Added
- **Federation capability** — multi-org management with OrgContext and FederationService
- **Policy capability** — business rule enforcement via `src/capabilities/policy/`
- **RLS policies** — Row Level Security on all 8 tables (`docs/00-canonical/rls-policies.sql`)
- **E2E test suite** — 5 test files covering auth, transactions, organizations, groups/events, cloud sync (45+ E2E tests)
- **A11y tests** — 27+ accessibility tests
- **Cross-import guard test** — prevents capability-to-capability and capability-to-UI imports
- **Template system** — church.ts as reference business pack with 14 roles, 3 forms, full RBAC
- **Manifest system** — ManifestCompilerService with compile() and validate()
- **MinimalRuntime** — register(), load(), start(), shutdown(), getCapability()

### Changed
- **All pages Ionic-wrapped** — 38/38 pages using `IonPage`
- **TopHeader → IonToolbar**, **BottomNav → IonTabBar**
- **org-1 hardcodes removed** — 4 → 0 in production code
- **dataLayer.ts** unified PowerSync primary with IndexedDB fallback
- **Test count** increased from 157 → 574

### Fixed
- Login.tsx div imbalance (build breaker)
- React Router v6 redirect → navigate migration
- OneSignal Capacitor plugin → Cordova bridge
- TypeScript errors — 0 remaining
- E2E orgContext mock initialization

### Removed
- `archiveService.ts` — ArchiveRegistry fully deleted
- All direct PowerSync queries from UI pages
- Dead code exports from `api.ts`

---

## [Sprint 25 — E2E Complete] — 2026-09-08

### Added
- E2E test: authentication flow (signUp, signIn, session persistence)
- E2E test: transaction lifecycle (create, approve, reject)
- E2E test: organization context and multi-org flows
- E2E test: groups and events management
- E2E test: cloud sync behavior
- orgContext mock initialization fix

### Changed
- Test count: 294 → 574 (including 45+ E2E tests)

---

## [Sprint 22 — Accessibility] — 2026-09-07

### Added
- A11y test suite (27+ tests)
- ARIA labels on interactive elements
- Keyboard navigation support
- Contrast ratio audit pass

---

## [Sprint 21 — Mobile] — 2026-09-06

### Added
- Capacitor 6 integration
- Android project generated
- Native notification adapter
- Native storage adapter
- Network adapter for offline detection

---

## [Sprint 12 — Legacy Elimination] — 2026-09-07

### Added
- Policy capability skeleton
- Dead code cleanup utilities

### Changed
- `useLocalStore.ts` reduced to 585 lines
- archiveService.ts deleted
- org-1 hardcodes removed from production code

### Removed
- ArchiveRegistry
- Direct DB query patterns from pages
- IndexedDB usage outside dataLayer.ts

---

## [Sprints 7.1-7.11 + 8] — 2026-08-30 to 2026-09-06

### Sprint 7.1 — Ionic Page Migration
- All 38 pages wrapped in `IonPage`
- App shell: `IonApp` + `IonReactRouter` + `IonRouterOutlet`
- Build fixed (Login.tsx div imbalance)

### Sprint 7.2 — RBAC + ArchiveRegistry
- `checkPermission`: stub → real implementation
- Notification capability created (OneSignal wrapper)
- TopHeader migrated to `IonToolbar`

### Sprint 7.3 — Capability Cleanup
- Workflow decoupled from `TransactionStatus` (generic string)
- Relationship: org_id filter added
- Security: checkPermission test coverage added

### Sprint 7.4 — org-1 + Store Decomposition
- org-1 hardcodes: 4 → 0 (dynamic resolution from auth profile)
- Store: 1117 → 898 lines
- Services extracted: versement-service, group-service

### Sprint 7.5 — Events Workflow
- `eventStatusGuard` added
- EventDetail integrates workflow capability

### Sprint 7.6 — Identity + Organization
- Identity capability skeleton created
- Organization capability skeleton created

### Sprint 7.7 — Store Decomposition Completion
- Store reduced to <600 lines (585)
- All business logic moved out of store

### Sprint 7.8-7.11 — Domain Migration
- Events: Workflow capability integration
- Archives: cleanup and lifecycle integration
- Members: relationship capability integration
- Finance: workflow integration complete

### Sprint 8 — Template System
- Template definition schema
- Template validation engine
- Church template as reference

---

## [Platform Foundation] — 2026-08-15

### Added
- Capability layer architecture (`src/capabilities/`)
- PowerSync integration (20 streams)
- RBAC system (`src/lib/rbac.ts`)
- Security facade (`src/capabilities/security/`)
- Resource capability (generic CRUD)
- Lifecycle capability (archive/restore with audit)
- Relationship capability (group memberships)
- Workflow capability (status transitions)
- Notification capability (OneSignal wrapper)

---

## [Migration from Legacy] — 2026-07-01

### Changed
- Migrated from monolithic `useLocalStore` to capability-based architecture
- Migrated from raw IndexedDB to PowerSync + Supabase
- Migrated from plain React to React + Ionic

### Removed
- `useLocalStore` business logic (~700 lines of business logic)
- Direct IndexedDB access from UI
- Legacy archive service patterns
