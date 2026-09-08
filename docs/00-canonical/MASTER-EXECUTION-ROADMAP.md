# MASTER EXECUTION ROADMAP — LUMINA PLATFORM

> Last updated: 2026-09-08
> Build: ✓ | TypeScript: 0 errors | Tests: 132/132 passing
> Current Phase: 2 (Foundation + Ionic Shell)

---

## EXECUTION STATUS SUMMARY

| Phase | Title | Progress | Status |
|-------|-------|----------|--------|
| 0 | Governance & Baseline | 100% | ✅ DONE |
| 1 | Capability Foundation | 75% | 🟡 PARTIAL |
| 2 | Foundation Capabilities | 20% | 🔴 INCOMPLETE |
| 3 | Data Canonicalization | 10% | 🔴 BLOCKED |
| 4 | Organization Platform | 5% | 🔴 NOT STARTED |
| 5 | Domain Migration | 15% | 🟡 PARTIAL |
| 6 | Store Decomposition | 10% | 🔴 NOT STARTED |
| 7 | Frontend Platform | 30% | 🟡 IN PROGRESS |
| 8-13 | Templates → Hardening | 0% | ⬜ NOT STARTED |

---

## PHASE 1 — CAPABILITY FOUNDATION (75%)

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
- [ ] All 5 capabilities have generic type contracts (no domain types)
- [ ] ArchiveRegistry fully removed from consumers
- [ ] checkPermission stub replaced with real evaluator
- [ ] 200+ tests across all capabilities

---

## PHASE 2 — FOUNDATION CAPABILITIES (20%)

### Current State
- Identity: NOT CREATED
- Organization: NOT CREATED
- Permission: MERGED into Security (acceptable)
- Notification: stub (OneSignal integration exists but not capability-wrapped)
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

## PHASE 7 — FRONTEND PLATFORM (30%)

### Completed
- ✅ Ionic React installed and integrated
- ✅ App shell: IonApp + IonReactRouter + IonRouterOutlet
- ✅ Theme mapping: Lumina tokens → Ionic CSS variables
- ✅ 38 routes mapped to Ionic routing
- ✅ Dark mode by default
- ✅ Capacitor config (OneSignal, SplashScreen)
- ✅ Redirect → Navigate fix (react-router v6)
- ✅ onesignal-capacitor-plugin → Cordova bridge fix

### In Progress
- 🟡 Page-by-page Ionic migration (0/38 wrapped)

### Remaining
- [ ] **IonPage wrapping**: 38 pages → `<IonPage><IonHeader><IonContent>`
- [ ] **BottomNav → IonTabBar**: Convert navigation component
- [ ] **TopHeader → IonToolbar**: Convert header component
- [ ] **Form inputs**: Replace `<input>` with `<IonInput>` where appropriate
- [ ] **Buttons**: Replace `<button>` with `<IonButton>` where appropriate
- [ ] **Modals**: Replace custom modals with IonModal/IonAlert
- [ ] **Loading states**: Replace spinners with IonSpinner/IonLoading
- [ ] **Toast/Alert**: Replace custom toasts with IonToast
- [ ] **Safe area handling**: Verify env(safe-area-inset-*) throughout
- [ ] **Keyboard handling**: Verify keyboardBehavior settings
- [ ] **Back button**: Add IonBackButton where navigation allows
- [ ] **Pull-to-refresh**: Add IonRefresher where list-based
- [ ] **Responsive layout**: Verify IonSplitPane behavior

### Gate Criteria
- All 38 pages wrapped in IonPage
- Zero raw `<BrowserRouter>` usage
- Zero raw `<Routes>` usage
- Ionic lifecycle hooks used where applicable (useIonViewWillEnter, etc.)
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

## PHASE 12 — LEGACY ELIMINATION (0%)

### Target Legacy Items
- [ ] `archiveService.ts` (ArchiveRegistry) — after Lifecycle migration complete
- [ ] `useLocalStore` business logic — after Phase 6 decomposition
- [ ] Direct PowerSync queries from UI — after capability integration
- [ ] `org-1` hardcoded default — after Phase 3 cleanup
- [ ] Duplicate permissions in Security + RBAC — after consolidation
- [ ] IndexedDB references — after PowerSync validation

### Gate Criteria
- Zero direct DB queries from pages
- Zero hardcoded org identifiers
- Zero deprecated service imports
- Store < 600 lines

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

## CURRENT SPRINT: SPRINT 7.1

### Objective
Migrate 38 pages to Ionic IonPage pattern (incremental, non-breaking)

### Tasks
| ID | Task | Dependencies | Estimate | Parallel? |
|----|------|-------------|----------|-----------|
| 7.1.1 | Migrate auth pages (Splash, AuthPage, Login, Onboarding, RoleSelection) | None | 2h | ✅ |
| 7.1.2 | Migrate core pages (Dashboard, Finance, Groups, Members, Events) | 7.1.1 | 4h | ✅ |
| 7.1.3 | Migrate detail pages (TransactionDetail, EventDetail, GroupDetail, MembreDetail) | 7.1.2 | 3h | ✅ |
| 7.1.4 | Migrate form pages (TransactionNew, EventNew, FormBuilder, FormFill) | 7.1.3 | 3h | ✅ |
| 7.1.5 | Migrate system pages (Settings, Help, Trace, History, Archives) | 7.1.4 | 2h | ✅ |
| 7.1.6 | Convert BottomNav to IonTabBar | 7.1.1 | 3h | ✅ |
| 7.1.7 | Convert TopHeader to IonToolbar | 7.1.1 | 1h | ✅ |
| 7.1.8 | Add Ionic lifecycle hooks where needed | 7.1.5 | 2h | ✅ |
| 7.1.9 | Final build + TypeScript + tests verification | All above | 1h | ❌ |

### Acceptance Criteria
- [ ] All 38 pages wrapped in IonPage
- [ ] Build passes (pnpm build)
- [ ] TypeScript clean (pnpm tsc --noEmit)
- [ ] All 132 tests pass
- [ ] No broken navigation
- [ ] No visual regressions on desktop
- [ ] Safe area handling verified on mobile

### Risks
- **HIGH**: Complex page structures (conditional returns, nested JSX) may cause wrapping errors
- **MEDIUM**: BottomNav → IonTabBar migration may break existing navigation state
- **LOW**: Ionic CSS may override some Tailwind styles

### Rollback Plan
- Ionic shell is a thin wrapper — pages remain unchanged
- Revert: `git revert b816c5d` removes all Ionic changes
- No data loss, no business logic changes

---

## NEXT SPRINT: SPRINT 7.2 (after 7.1 gates pass)

### Objective
Replace checkPermission stub with real RBAC evaluator + remove ArchiveRegistry

### Tasks
| ID | Task | Dependencies | Estimate |
|----|------|-------------|----------|
| 7.2.1 | Implement checkPermission using PERMISSION_MATRIX | None | 2h |
| 7.2.2 | Add hasPermission() usage in 3 UI consumers | 7.2.1 | 1h |
| 7.2.3 | Remove ArchiveRegistry, verify no consumers remain | 7.2.1 | 1h |
| 7.2.4 | Add RBAC tests (permission matrix coverage) | 7.2.1 | 2h |
| 7.2.5 | Verify build + tests + TypeScript | 7.2.4 | 0.5h |

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

### Critical Path
Phase 1 → Phase 3 → Phase 4 → Phase 8 → Phase 9 → Phase 10 → Phase 11

### Parallel Paths
- Phase 7 (Frontend) runs independently
- Phase 5 (Domain) runs in parallel with Phase 6 (Store)
- Phase 2 (Foundation) can start partial work now (Notification)

---

## METRICS TRACKING

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| TypeScript errors | 0 | 0 | ✅ |
| Build status | ✓ | ✓ | ✅ |
| Test coverage | 132 passing | 200+ passing | 🔴 -68 |
| Capability lines | 723 | 800 (stable) | ✅ |
| Store lines | 1117 | <600 | 🔴 -517 |
| Pages Ionic-wrapped | 0/38 | 38/38 | 🔴 -38 |
| Hardcoded org-1 | 4 files | 0 | 🔴 -4 |
| RBAC stub usage | 3 consumers | 0 | 🔴 -3 |
| ArchiveRegistry usage | 0 (deprecated) | 0 | ✅ |

---

## GATE CHECKLIST — SPRINT 7.1

- [ ] **Gate A (Architecture)**: IonPage wrapping follows Ionic patterns
- [ ] **Gate B (TypeScript)**: 0 errors
- [ ] **Gate C (Tests)**: 132+ tests passing
- [ ] **Gate D (Build)**: Production build succeeds
- [ ] **Gate E (Data Integrity)**: No data loss from Ionic wrapper
- [ ] **Gate F (Security)**: No new security surface introduced
- [ ] **Gate G (UX)**: Navigation works, no visual regressions
- [ ] **Gate H (Diff Scope)**: Only Ionic additions, no business logic changes

---

## LEGACY ARTIFACTS TO TRACK

| Artifact | Lines | Status | Action |
|----------|-------|--------|--------|
| `archiveService.ts` | 85 | @deprecated | Remove after Phase 5 |
| `useLocalStore.ts` | 1117 | Partial migration | Decompose Phase 6 |
| `checkPermission` stub | 1 | stub | Replace Phase 7.2 |
| `org-1` default | 4 refs | hardcode | Dynamic resolve Phase 3 |
| `Redirect` import | 0 | removed | Already fixed |

---

## ARCHITECTURE STATUS

```
                         LUMINA PLATFORM
                              │
                    ┌─────────┴─────────┐
                    │                   │
               Runtime              Business Packs
               (NOT STARTED)         (NOT STARTED)
                    │                   │
                    └─────────┬─────────┘
                              │
                       Organization Manifest
                       (NOT STARTED)
                              │
                           Template
                       (NOT STARTED)
                              │
                    ┌─────────┴─────────┐
                    │                   │
          Platform Capabilities    Foundation
          (5/13 implemented)       (partial)
                    │                   │
                    └─────────┬─────────┘
                              │
                      Supabase + PowerSync
                              │
                         Local DB
                              │
                    ┌─────────┴─────────┐
                    │                   │
                 Ionic React        Capacitor
                 (SHELL ONLY)        (CONFIGURED)
                    │
              0/38 Pages wrapped
```
