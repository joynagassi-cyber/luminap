# CHANGELOG

All notable changes to the Lumina Platform will be documented in this file.

---

## [Platform Complete] — 2026-09-09

### Summary
The Lumina Platform has reached a stable, production-ready state. All core phases (0-8, 12-13) are complete. 294 tests passing, 0 TypeScript errors, 585-line store (target: <600).

### Added
- **Policy capability** — business rule enforcement via `src/capabilities/policy/`
- **Organization capability** — multi-org context resolution skeleton
- **RLS policies** — Row Level Security on all 8 tables (`docs/00-canonical/rls-policies.sql`)
- **Cross-import guard test** — prevents capability-to-capability and capability-to-UI imports
- **e2e test suite** — 45 tests covering full platform flow (identity, lifecycle, relationships, transactions)

### Changed
- **Store decomposed** — `useLocalStore.ts`: 1117 → 585 lines (-48%)
- **All pages Ionic-wrapped** — 38/38 pages using `IonPage`
- **TopHeader → IonToolbar**, **BottomNav → IonTabBar**
- **org-1 hardcodes removed** — 4 → 0 in production code
- **dataLayer.ts** unified PowerSync primary with IndexedDB fallback
- **Test count** increased from 157 → 294

### Removed
- `archiveService.ts` — ArchiveRegistry fully deleted
- All direct PowerSync queries from UI pages
- Dead code exports from `api.ts`

### Fixed
- Login.tsx div imbalance (build breaker)
- React Router v6 redirect → navigate migration
- OneSignal Capacitor plugin → Cordova bridge
- TypeScript errors — 0 remaining

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
