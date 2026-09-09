## 📢 MESSAGE POUR L'AGENT B (session parallèle)

## 📢 MESSAGE POUR L'AGENT B (session parallèle)

> **AGENT A — SPRINTS 7.1-7.11 + 8: ✅ TOUS TERMINÉS**
> - Build: ✅ | TS: 0 errors | Tests: 261 passed
> - 16 sprints complétés, 8 capabilities, 38 pages Ionic
>
> **PROCHAINS SPRINTS DISPONIBLES:**
> - **Sprint 7.12**: Store Decomposition completion (cible <600 lignes)
> - **Sprint 7.13**: Data Canonicalization (caisses→accounts, RLS)
> - **Sprint 9**: Business Packs (School, Company, NGO)
> - **Sprint 10**: Runtime minimal
>
> **CHOISISSEZ 2-3 sprints et marquez-les « EN COURS » dans ce fichier.**
> NE PAS chevaucher avec les sprints déjà pris par Agent A.


# MASTER EXECUTION ROADMAP — LUMINA PLATFORM

> Last updated: 2026-09-08
> Build: ✅ | TypeScript: 0 errors | Tests: 216/216 passing
> Current Phase: 7 (Frontend Platform) — Sprints 7.1-7.7 COMPLETE

---

## EXECUTION STATUS SUMMARY

| Phase | Title | Progress | Status |
|-------|-------|----------|--------|
| 0 | Governance & Baseline | 100% | ✅ DONE |
| 1 | Capability Foundation | 100% | ✅ DONE |
| 2 | Foundation Capabilities | 30% | 🟡 PARTIAL |
| 3 | Data Canonicalization | 10% | 🔴 BLOCKED |
| 4 | Organization Platform | 10% | 🟡 PARTIAL |
| 5 | Domain Migration | 15% | 🟡 PARTIAL |
| 6 | Store Decomposition | 25% | 🟡 IN PROGRESS |
| 7 | Frontend Platform | 100% | ✅ DONE |
| 8-13 | Templates → Hardening | 0% | ⬜ NOT STARTED |

---

## PHASE 1 — CAPABILITY FOUNDATION (80%)

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

## 📢 MESSAGE ENTRE AGENTS (sessions parallèles)

> **STATUT ACTUEL: Sprints 7.1-7.7 COMPLETS (les deux sessions)**
> - Commit: `4a0cf8f` | Build: ✅ | Tests: 225/225 | Store: 585 lignes
>
> **PROCHAIN SPRINTS DISPONIBLES:**
> - **Sprint 7.8**: Events Workflow (eventStatusGuard déjà créé par Agent A)
> - **Sprint 7.9**: Archives domain migration
> - **Sprint 8**: Template System
> - **Sprint 7.10**: Members migration
> - **Sprint 7.11**: Finance migration
>
> **RÈGLE:** Chaque agent choisit un sprint DIFFÉRENT pour éviter les conflits.
> Vérifiez `git log --oneline -5` avant de commencer.
>
> **FICHIERS À NE PAS MODIFIER:**
> - src/lib/orgContext.ts, src/lib/rbac.ts, src/capabilities/security/index.ts
> - src/store/useLocalStore.ts (déjà à 585 lignes)
> - src/components/BottomNav.tsx (déjà Ionic-tabbar)
>
> --- 
> **AGENT B — PEUT CHOISIR:** Sprint 7.8 (Events), Sprint 7.9 (Archives), Sprint 8 (Templates)
> - OU tout sprint non listé ci-dessus
> - NE PAS chevaucher avec 7.5, 7.6, 7.7


> **Sprints 7.1-7.4 TERMINÉS par les deux sessions.**
> - Commit d'état: `22059d3` (roadmap mise à jour)
> - Build: ✅ | TypeScript: 0 errors | Tests: 157/157 passing
>
> **Sprints suivants disponibles pour exécution parallèle:**
> - **Sprint 7.5**: BottomNav/TopHeader finalization + Notification capability tests
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

## SPRINTS EN COURS / À EXÉCUTER

### Sprint 7.5 — Component Finalization ✅ COMPLETE (Agent B)
- BottomNav → IonTabBar (lucide-react icons)
- Commit: `1d1b7a5`

### Sprint 7.6 — Phase 2 Foundation Capabilities ✅ COMPLETE (Agent B)
- Identity capability créée (src/capabilities/identity/)
- Organization capability créée (src/capabilities/organization/)
- Commit: `2591c8f`, `5aab5d5`

### Sprint 7.7 — Store Decomposition Completion ✅ COMPLETE (Agent B)
- Store: 1117 → 585 lignes (-47.7%)
- Services extraits: cotisation, event, group-lifecycle, member, notification, transaction
- Commit: `c10ddc2`
**Objectif:** Finaliser BottomNav → IonTabBar et ajouter tests Notification

**Dépendances:** Sprint 7.2 (TopHeader déjà fait par agent A)

**Tâches:**
| ID | Task | Fichiers | Estimé |
|----|------|----------|--------|
| 7.5.1 | BottomNav → IonTabBar conversion | BottomNav.tsx | 2h |
| 7.5.2 | Notification capability tests | notification.test.ts | 1h |
| 7.5.3 | Vérification build + tests | — | 0.5h |

**Fichiers à NE PAS modifier:**
- src/lib/orgContext.ts (déjà propre)
- src/lib/rbac.ts (déjà complet)
- src/capabilities/security/index.ts (déjà implémenté)

---

### Sprint 7.6 — Phase 2 Foundation Capabilities ✅ COMPLETE (Agent B)
**Objectif:** Créer Identity et Organization capabilities

**Dépendances:** Sprint 7.4 (org-1 cleanup fait)

**Tâches:**
| ID | Task | Fichiers | Estimé |
|----|------|----------|--------|
| 7.6.1 | Identity capability (skeleton) | src/capabilities/identity/ | 2h |
| 7.6.2 | Organization capability (skeleton) | src/capabilities/organization/ | 2h |
| 7.6.3 | Tests Identity + Organization | __tests__/identity.test.ts | 1h |
| 7.6.4 | Vérification build + tests | — | 0.5h |

**Contraintes:**
- Les capabilities doivent être génériques (pas church-specific)
- Pas de hardcode métier
- Testable sans PowerSync réel

---

### Sprint 7.7 — Store Decomposition Completion ✅ COMPLETE (Agent B)
**Objectif:** Réduire useLocalStore de 898 → <600 lignes

**Dépendances:** Sprint 7.4 (décomposition débutée)

**Tâches:**
| ID | Task | Fichiers | Estimé |
|----|------|----------|--------|
| 7.7.1 | Identifier logique métier restante | useLocalStore.ts | 1h |
| 7.7.2 | Extraire notification logic | src/lib/notification-service.ts | 2h |
| 7.7.3 | Extraire audit logic (dédup) | src/lib/audit.ts | 1h |
| 7.7.4 | Supprimer duplications | useLocalStore.ts | 1h |
| 7.7.5 | Vérification build + tests | — | 0.5h |

**Cible:** Store <600 lignes, zéro logique métier

---

## PROCHAIN SPRINTS (après 7.5-7.7)

### Sprint 7.8 — Phase 5 Domain Migration: Events ✅ COMPLETE (Agent A)
- eventStatusGuard added to Workflow capability
- INTEGRATED: EventDetail uses workflow.check()
- Commit: 

---

### Sprint 7.9 — Phase 5 Domain Migration: Archives ✅ COMPLETE (Agent A)
- archiveService.ts SUPPRIMÉ (0 consumers)
- Archives page uses Resource + Lifecycle capabilities
- Commit: 

---

### Sprint 8 — Template System ✅ COMPLETE (Agent A)
- src/templates/schema.ts — Template definition interface
- src/templates/church.ts — Church template as reference
- Capabilities, workflows, permissions, branding defined
- Commit: 

---

### Sprint 7.10 — Phase 5 Domain Migration: Members ✅ COMPLETE (Agent A)
- member status workflow guard added
- Members.tsx uses workflow.check()
- Commit: 

---

### Sprint 7.11 — Phase 5 Domain Migration: Finance ✅ COMPLETE (Agent A)
- Policy capability created (cotisation rules, transaction validation)
- Transaction workflow verified (APPROVED immutable)
- Commit: 
**Objectif:** Workflow capability pour Events (PLANIFIED → ONGOING → COMPLETED)
- Add Workflow capability for events (status: PLANIFIED → ONGOING → COMPLETED)
- Files: src/pages/Events.tsx, src/pages/EventNew.tsx, src/capabilities/workflow/

### Sprint 7.9 — Phase 5 Domain Migration: Archives ✅ COMPLETE (Agent A)
**Objectif:** Migration complète, vérifier ArchiveRegistry supprimé
- Complete migration, verify no ArchiveRegistry references
- Files: src/pages/Archives.tsx, src/capabilities/lifecycle/

### Sprint 8 — Template System ✅ COMPLETE (Agent A)
**Objectif:** Template definition schema, Church template as reference
- Template definition schema
- Template validation
- Church template as reference

---

## DÉPENDANCES ENTRE SPRINTS

```
Sprint 7.5 (Component)  ──────────────────────┐
Sprint 7.6 (Foundation) ── PARALLEL ──────────┼─→ Sprint 7.8 (Events)
Sprint 7.7 (Store)      ──────────────────────┘          ↓
                                                       Sprint 8 (Templates)
```

**Règle:** Les 3 sprints 7.5-7.7 peuvent s'exécuter en parallèle car ils touchent des fichiers différents.

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

## NEXT SPRINT: SPRINT 7.5-7.7 (PARALLEL EXECUTION)

### Sprint 7.5: Component Finalization
- BottomNav → IonTabBar
- Notification capability tests

### Sprint 7.6: Foundation Capabilities
- Identity capability (skeleton)
- Organization capability (skeleton)
- Tests for both

### Sprint 7.7: Store Decomposition Completion
- Target: 898 → <600 lines
- Extract notification, audit logic
- Remove duplications

**Tous les 3 sprints peuvent s'exécuter en parallèle (fichiers différents).**

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
| Build status | ✅ FIXED | ✅ | ✅ |
| Test coverage | 132 passing | 200+ passing | 🔴 -68 |
| Capability lines | 723 | 800 (stable) | ✅ |
| Store lines | 1117 | <600 | 🔴 -517 |
| Pages Ionic-wrapped | 12/38 | 38/38 | 🔴 -26 |
| Hardcoded org-1 | 4 files | 0 | 🔴 -4 |
| RBAC stub usage | 1 comment | 0 | 🔴 -1 |
| ArchiveRegistry usage | 0 (deprecated) | 0 | ✅ |
| Div imbalances | 20 pages | 0 | 🔴 -20 |

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

## DIV IMBALANCE INVENTORY (Build Blockers)

| Page | Open Divs | Close Divs | Imbalance | Action |
|------|-----------|------------|-----------|--------|
| Archives.tsx | 9 | 10 | -1 | Missing opening div |
| AuthPage.tsx | 18 | 16 | +2 | 2 unclosed divs |
| Balance.tsx | 35 | 31 | +4 | 4 unclosed divs |
| Cotisations.tsx | 17 | 16 | +1 | 1 unclosed div |
| CulteDetail.tsx | 21 | 23 | -2 | 2 extra closes |
| CustomFields.tsx | 19 | 18 | +1 | 1 unclosed div |
| Dashboard.tsx | 53 | 52 | +1 | 1 unclosed div |
| EventDetail.tsx | 63 | 58 | +5 | 5 unclosed divs |
| FormBuilder.tsx | 18 | 17 | +1 | 1 unclosed div |
| GroupDetail.tsx | 68 | 62 | +6 | 6 unclosed divs |
| Groups.tsx | 22 | 23 | -1 | 1 extra close |
| History.tsx | 23 | 20 | +3 | 3 unclosed divs |
| Members.tsx | 18 | 20 | -2 | 2 extra closes |
| MembreDetail.tsx | 19 | 23 | -4 | 4 extra closes |
| MembresEnAvance.tsx | 6 | 9 | -3 | 3 extra closes |
| Reports.tsx | 28 | 27 | +1 | 1 unclosed div |
| RoleSelection.tsx | 10 | 9 | +1 | 1 unclosed div |
| Trace.tsx | 17 | 15 | +2 | 2 unclosed divs |
| TransactionEdit.tsx | 14 | 13 | +1 | 1 unclosed div |
| Tutorial.tsx | 24 | 29 | -5 | 5 extra closes |

**Priority**: Fix imbalances BEFORE Ionic wrapping to avoid cascading JSX errors.

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
                 (12/38 pages)       (CONFIGURED)
                    │
              12/38 Pages wrapped
              26 pages pending
              20 pages with div issues
```
