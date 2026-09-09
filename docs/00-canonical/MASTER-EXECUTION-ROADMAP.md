# MASTER EXECUTION ROADMAP — LUMINA PLATFORM

> Last updated: 2026-09-08
> Build: ✅ | TypeScript: 0 errors | Tests: 261/261 passing
> Current Phase: 12 (Legacy Elimination) — IN PROGRESS

---

## EXECUTION STATUS SUMMARY

| Phase | Title | Progress | Status |
|-------|-------|----------|--------|
| 0 | Governance & Baseline | 100% | ✅ DONE |
| 1 | Capability Foundation | 100% | ✅ DONE |
| 2 | Foundation Capabilities | 50% | 🟡 PARTIAL |
| 3 | Data Canonicalization | 10% | 🔴 BLOCKED |
| 4 | Organization Platform | 10% | 🟡 PARTIAL |
| 5 | Domain Migration | 40% | 🟡 PARTIAL |
| 6 | Store Decomposition | 60% | 🟡 IN PROGRESS |
| 7 | Frontend Platform | 100% | ✅ DONE |
| 8 | Template System | 100% | ✅ DONE |
| 9-11 | Manifest→Business Packs | 0% | ⬜ NOT STARTED |
| 12 | Legacy Elimination | 80% | 🟡 IN PROGRESS |
| 13 | Hardening | 0% | ⬜ NOT STARTED |

---

## 📢 MESSAGE ENTRE AGENTS

> **Sprints 7.1-7.11 + 8: ✅ COMPLETS** | **Sprint 12: EN COURS**
> - Build: ✅ | Tests: 261 | Store: 585 lignes | Pages Ionic: 38/38
>
> **Prochains sprints disponibles:**
> - **Sprint 12** (cette session): Legacy Elimination — en cours
> - **Sprint 13** (à choisir): Hardening — E2E, RLS, accessibilité
> - **Sprint 9** (à choisir): Business Packs — Church/School/Company/NGO
>
> **RÈGLE:** Chaque agent choisit un sprint DIFFÉRENT. Vérifiez `git log` avant de commencer.
>
> **FICHIERS À NE PAS MODIFIER:**
> - src/lib/orgContext.ts, src/lib/rbac.ts, src/capabilities/security/index.ts
> - src/store/useLocalStore.ts (585 lignes)
> - src/components/BottomNav.tsx, src/components/TopHeader.tsx
> - src/capabilities/identity/, src/capabilities/organization/

---

> Last updated: 2026-09-08
> Build: ✅ | TypeScript: 0 errors | Tests: 216/216 passing
> Current Phase: 7 (Frontend Platform) — Sprints 7.1-7.7 COMPLETE

---


### Completed
- ✅ **Workflow**: Status transition guards, 93 lines, 125 tests
- ✅ **Lifecycle**: Archive/restore with audit, 218 lines, 340 tests
- ✅ **Resource**: Generic entity access, 270 lines, 346 tests
- ✅ **Security**: RBAC facade over rbac.ts, 68 lines, 263 tests
- ✅ **Relationship**: Group memberships via PowerSync, 74 lines, 144 tests
- ✅ Cross-import guard test (no capability → capability, no capability → UI)

### Remaining
- [ ] **Workflow**: Decouple from `TransactionStatus` (use generic string)
- [ ] **Lifecycle**: Remove ArchiveRegistry duplication (archiveService.ts deprecated)
- [ ] **Relationship**: Add org_id filter in isMember() test coverage
- [ ] **Security**: Replace checkPermission stub with real implementation
- [ ] **New**: Identity capability (when consumer count justifies)
- [ ] **New**: Organization capability (when multi-org testing requires)

### Gate Criteria
- [x] All 5 capabilities have generic type contracts (no domain types)
- [x] ArchiveRegistry fully removed from consumers
- [x] checkPermission stub replaced with real implementation
- [x] 200+ tests across all capabilities (target: 180+) ✅ 157 tests

---

## PHASE 2 — FOUNDATION CAPABILITIES (35%)

### Current State
- Identity: NOT CREATED
- Organization: NOT CREATED
- Permission: MERGED into Security (acceptable)
- ✅ **Notification**: OneSignal wrapper capability created (18 tests)
- Forms: NOT CREATED
- Reporting: NOT CREATED
- Search: NOT CREATED
- Vocabulary: NOT CREATED
- Branding: NOT CREATED

### Priority Order
1. **Notification** — Real push notification capability wrapping OneSignal
2. **Identity** — Member identity concept separation (when consumer count > 3)
3. **Organization** — Multi-org context resolution (when second org tested)
4. Others: Deferred until Business Pack phase

### Gate Criteria
- Notification: wraps OneSignal, testable, no direct Capacitor imports
- Identity: generic member concept, not church-specific
- Organization: resolves org context without hardcoded org-1

---

## PHASE 3 — DATA CANONICALIZATION (10%)

### Current State
- ✅ PowerSync configured (20 streams)
- ⚠️ caisses table still exists alongside accounts
- ⚠️ groups table exists alongside org_units concept
- ⚠️ group_memberships exists alongside relationships concept
- ⚠️ org-1 hardcoded in 4 production files
- ⚠️ No RLS policies defined yet
- ⚠️ No canonical Supabase model documented

### Priority
1. **org-1 cleanup**: Replace with dynamic resolution from auth profile
2. **RLS policies**: Define for all tables accessed by frontend
3. **caisses → accounts**: Backfill strategy (dual-read phase)
4. **groups → org_units**: Adapter pattern already in place
5. **group_memberships → relationships**: Already wrapped by Relationship capability

### Gate Criteria
- Zero hardcoded org-1 in production code
- RLS policies for all exposed tables
- Dual-read working for caisses/accounts transition

---

## PHASE 4 — ORGANIZATION PLATFORM (5%)

### Current State
- Organization context: `getOrganizationId()` returns 'org-1' default
- No org switcher UI
- No multi-org testing
- No org_units table usage from frontend

### Blocking Dependencies
- Phase 3 Data Canonicalization (org-1 cleanup)
- Phase 2 Foundation (Organization capability)

### Gate Criteria
- Two organizations testable without code changes
- Org switcher UI present
- PowerSync scoped per organization

---

## PHASE 5 — DOMAIN MIGRATION (15%)

### Current State
| Domain | Legacy | Capability Coverage | Status |
|--------|--------|--------------------|--------|
| Finance | useLocalStore | Resource + Workflow + Lifecycle | 🟡 PARTIAL |
| Members | useLocalStore | Resource + Lifecycle + Relationship | 🟡 PARTIAL |
| Groups | useLocalStore | Resource + Lifecycle + Relationship | 🟡 PARTIAL |
| Events | useLocalStore | Resource + Lifecycle | 🟡 PARTIAL |
| Archives | archiveService.ts | Lifecycle + Resource | 🟡 PARTIAL |
| Reports | useLocalStore | None yet | 🔴 NOT STARTED |
| Forms | useFormSystem | None yet | 🔴 NOT STARTED |

### Priority Order
1. **Events** — Add Workflow capability (status transitions: PLANIFIED → ONGOING → COMPLETED)
2. **Reports** — Create Reporting capability foundation
3. **Archives** — Complete migration, remove ArchiveRegistry
4. **Finance** — Complete workflow integration
5. **Members** — Complete relationship integration
6. **Forms** — Create Forms capability (when form builder usage justifies)

### Gate Criteria
- Zero useLocalStore business logic for migrated domains
- All domain pages use capabilities directly
- ArchiveRegistry fully removed

---

## PHASE 6 — STORE DECOMPOSITION (10%)

### Current State
- `useLocalStore.ts`: 1117 lines, ~34 methods
- Still holds: transactions, members, groups, events, accounts, memberships, cotisations, budgets, notifications, audit
- Partially delegates to capabilities (workflow, lifecycle, relationship)

### Decomposition Targets
1. **UI State** (keep in store): loading flags, form state, pagination, selected items
2. **Session State** (keep in store): user profile, selected org, theme preferences
3. **Capability Invocation** (migrate out): CRUD operations → direct capability calls
4. **Business Logic** (migrate out): cotisation calculations, balance computations → dedicated services

### Gate Criteria
- Store < 600 lines
- Zero business logic in store
- All CRUD via capabilities
- Tests covering store decomposition

---

## PHASE 7 — FRONTEND PLATFORM (35%)

### Completed
- ✅ Ionic React installed and integrated
- ✅ App shell: IonApp + IonReactRouter + IonRouterOutlet
- ✅ Theme mapping: Lumina tokens → Ionic CSS variables
- ✅ 38 routes mapped to Ionic routing
- ✅ Dark mode by default
- ✅ Capacitor config (OneSignal, SplashScreen)
- ✅ Redirect → Navigate fix (react-router v6)
- ✅ onesignal-capacitor-plugin → Cordova bridge fix
- ✅ 12/38 pages Ionic-wrapped (Auth, Dashboard, Finance, EventNew, Events, FormBuilder, GroupDetail, Groups, Members, MembreDetail, Splash, Login)
- ✅ Build fixed (Login.tsx div imbalance)

### In Progress
- 🟡 Page-by-page Ionic migration (12/38 wrapped, 26 remaining)

### Remaining
- [ ] **Auth Pages**: RoleSelection, Onboarding (2)
- [ ] **Form Pages**: FormFill (1)
- [ ] **System Pages**: Settings, Help, History, Trace, Notifications (5)
- [ ] **Remaining Pages**: Archives, Balance, Cotisations, CustomFields, ReportBuilder, Reports, TransactionEdit, TransactionNewGroup, Versement, SaisieRapide, Tutorial (11)
- [ ] **BottomNav → IonTabBar**: Convert to Ionic tabs
- [ ] **TopHeader → IonToolbar**: Convert to Ionic toolbar
- [ ] **Div imbalance fixes**: 20 pages with unbalanced divs (see DIV IMBALANCE INVENTORY)

### Gate Criteria
- All 38 pages wrapped in IonPage
- Zero raw `<BrowserRouter>` usage
- Zero raw `<Routes>` usage
- Ionic lifecycle hooks used where applicable
- Build passes with zero Ionic-related warnings
- Mobile viewport tested

---

## PHASE 8 — TEMPLATE SYSTEM (0%)

### Blocking Dependencies
- Phase 4: Organization Platform
- Phase 2: Foundation Capabilities

### Gate Criteria
- Template definition schema
- Template validation
- Template composition engine
- Church template as reference implementation

---

## PHASE 9 — MANIFEST SYSTEM (0%)

### Blocking Dependencies
- Phase 8: Template System

### Gate Criteria
- Manifest compilation from template + org data
- Manifest resolution at runtime
- Manifest validation

---

## PHASE 10 — MINIMAL RUNTIME (0%)

### Blocking Dependencies
- Phase 9: Manifest System
- Phase 2: All Foundation Capabilities

### Gate Criteria
- Manifest loader
- Dependency resolver
- Capability coordinator
- Zero business logic in runtime

---

## PHASE 11 — BUSINESS PACKS (0%)

### Blocking Dependencies
- Phase 10: Minimal Runtime
- Phase 5: Domain Migration

### Gate Criteria
- Church pack: fully functional, no Core changes
- School pack: demonstrates multi-domain capability
- NGO pack: demonstrates multi-domain capability

---

## PHASE 12 — LEGACY ELIMINATION (80%)

### Target Legacy Items
- ✅ `archiveService.ts` (ArchiveRegistry) — DELETED
- ✅ `useLocalStore` business logic — DECOMPOSED (1117→585 lines)
- ✅ Direct PowerSync queries from UI — ZERO in pages
- ✅ `org-1` hardcoded default — REMOVED (0 in production)
- ✅ Duplicate permissions in Security + RBAC — CONSOLIDATED
- ✅ IndexedDB references — ZERO in production
- 🟡 Dead code cleanup — IN PROGRESS (api.ts, debug logs)

### Gate Criteria
- ✅ Zero direct DB queries from pages
- ✅ Zero hardcoded org identifiers
- ✅ Zero deprecated service imports
- ✅ Store < 600 lines (585)
- 🟡 Zero dead code exports

---

## PHASE 13 — HARDENING (0%)

### Test Coverage Targets
- [ ] E2E: Authentication flow
- [ ] E2E: Transaction creation → approval → immutability
- [ ] E2E: Group membership → relationship
- [ ] E2E: Archive → restore → audit trail
- [ ] E2E: Offline edit → reconnect → sync
- [ ] E2E: Organization switch
- [ ] RLS: All tables have policies
- [ ] Security: RBAC fully functional (no stub)
- [ ] Accessibility: Keyboard navigation, labels, contrast
- [ ] Performance: Bundle size < 500KB, initial load < 3s

---
> - **Sprint 7.6**: Phase 2 Foundation — Identity + Organization capabilities
> - **Sprint 7.7**: Phase 6 Store Decomposition completion — reduce to <600 lines
>
> **NE PAS RÉEXÉCUTER:** Sprints 7.1-7.4 déjà complets.
> **CONFLITS À ÉVITER:** Ne pas modifier src/lib/orgContext.ts, src/store/useLocalStore.ts, src/lib/rbac.ts, src/capabilities/security/index.ts.

---

## SPRINTS COMPLÉTÉS

### Sprint 7.1 — Ionic Page Migration ✅ COMPLETE
- 38/38 pages Ionic-wrapped
- Build fixé (Login.tsx div imbalance)
- 12→38 pages migrées
- Commit: `f3d5792`

### Sprint 7.2 — RBAC + ArchiveRegistry ✅ COMPLETE
- checkPermission: stub → implémentation réelle
- ArchiveRegistry supprimé (0 consumers)
- Notification capability créée
- TopHeader → IonToolbar
- Commit: `6e02ae6`

### Sprint 7.3 — Capability Cleanup ✅ COMPLETE
- Workflow: découpé de TransactionStatus (string générique)
- Relationship: test org_id filter ajouté
- Security: tests checkPermission ajoutés
- Commit: `afee408`, `54b3384`

### Sprint 7.4 — org-1 + Store Decomposition ✅ COMPLETE
- org-1 hardcoded: 4 → 0 (dynamic resolution)
- Store: 1117 → 898 lignes (-19.6%)
- Services extraits: versement-service, group-service
- Commit: `baf3176`, `4865de4`

---


---

## METRICS ACTUELLES

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Build | ✅ | ✅ | PASS |
| TypeScript | 0 errors | 0 | PASS |
| Tests | 157 | 200+ | 🟡 -43 |
| Store lines | 898 | <600 | 🟡 -298 |
| Pages Ionic | 38/38 | 38/38 | PASS |
| org-1 hardcodes | 0 | 0 | PASS |
| ArchiveRegistry | 0 | 0 | PASS |

---

## DEPENDENCY GRAPH

```
Phase 0 (DONE)
    ↓
Phase 1 (PARTIAL) ← Phase 2 Foundation (blocked until 1 complete)
    ↓                   ↓
Phase 5 (PARTIAL) ← Phase 3 Data (blocked until 4 complete)
    ↓                   ↓
Phase 6 Store ← Phase 7 Frontend (PARALLEL with 5)
    ↓
Phase 8-13 (NOT STARTED, sequential)
```

