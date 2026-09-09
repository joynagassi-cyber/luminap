# PLATFORM COMPLETE — Checklist

> Generated: 2026-09-09
> Branch: main
> Commit: d83d27a

---

## Checklist Status

| # | Critère | Statut | Preuve |
|---|---------|--------|--------|
| 1 | Core concepts stables | **PASS** | 10 capabilities (workflow, lifecycle, relationship, resource, security, notification, identity, organization, federation, policy) + manifest system + template schema |
| 2 | Foundation stable | **PASS** | Supabase + PowerSync, 5 adapters, orgContext, unified dataLayer |
| 3 | Capabilities reutilisables | **PASS** | All 10 capabilities are domain-agnostic with documented interfaces and tests |
| 4 | Organization dynamique | **PASS** | FederationService, OrgContext, multi-org sync streams in powersync/sync-config.yaml |
| 5 | Security réelle | **PASS** | RBAC avec PERMISSION_MATRIX, SecurityService capability, policy checks dans 14+ tests |
| 6 | Supabase canonical | **PASS** | SupabaseConnector.ts, migrations/, sync-config.yaml (20 streams) |
| 7 | PowerSync canonical | **PASS** | powersync/cli.yaml, service.yaml, sync-config.yaml, sync-fetched.yaml |
| 8 | Domain models separes | **PARTIAL** | Templates system exists but church-specific code still in lib/ (export.ts, rbac.ts comments) |
| 9 | Church Pack fonctionnel | **PASS** | church.ts: workflows (Transaction, Event, Member), 14 roles, 3 forms, RBAC, branding |
| 10 | Template fonctionnel | **PASS** | schema.ts: Template interface complete; church.ts: full implementation |
| 11 | Manifest fonctionnel | **PASS** | compiler.ts: ManifestCompilerService with compile() et validate() |
| 12 | Runtime minimal | **PASS** | MinimalRuntime: register(), load(), start(), shutdown(), getCapability() |
| 13 | UI principale complete | **PASS** | 38 pages, Ionic routing.tsx (48 routes), theme.css, theme.ts |
| 14 | Tests critiques presents | **PASS** | 14 unit tests + 5 e2e test files (649 lines) |
| 15 | Legacy suffisamment réduit | **PARTIAL** | useLocalStore still referenced in ~10 pages; dataLayer is the new standard; adapters bridge legacy |
| 16 | Au moins deux Business Packs valides | **FAIL** | Un seul pack: `church`. Aucun deuxieme template existe. |
| 17 | Frontend Ionic/Capacitor valide | **PASS** | IonicApp.tsx, routing.tsx, capacitor.config.ts, projet Android present |

---

## Resume

- **PASS**: 14
- **PARTIAL**: 2
- **FAIL**: 1

---

## Gaps Identify

### CRITICAL — Requirement #16 Non Satisfait

**Problem:** Only 1 business pack validated (church). The PLATFORM COMPLETE criteria requires at least 2.

**Action Required:** Create a second template (e.g., `school.ts` or `ngo.ts`) implementing the same `Template` interface with:
- Workflow definitions for its entity types
- Role-permission matrix (can reuse PERMISSION_MATRIX with domain-specific additions)
- Role metadata
- Form definitions
- Branding/colors/labels
- Capability declarations

### MODERATE — Requirement #8 Domain Models Separates

**Problem:** Church-specific terminology and logic still leaks into shared infrastructure:
- `src/lib/export.ts` hardcodes `'Église MFE-JC Centrale'`
- `src/lib/rbac.ts` contains comments about moving `cotisation:manage` to domain policy
- `src/lib/cotisation-service.ts` is church-specific

**Action Required:** Move church-specific logic from `src/lib/` into the template system or a church-specific pack directory. The `lib/` layer should remain domain-agnostic.

### MODERATE — Requirement #15 Legacy Reduction

**Problem:** `useLocalStore` (legacy IndexedDB store) still imported by ~10 pages:
- AuthPage, Balance, Cotisations, CulteDetail, Dashboard, EventDetail, EventEdit, EventNew, Events, Finance

**Status:** This is expected per the migration plan (Sprint 25 goal). The dataLayer abstraction exists but pages haven't all been migrated yet.

**Action Required:** Continue migration of pages to use `dataLayer` hooks instead of `useLocalStore`. Track progress in migration plan.

---

## Files Referenced

### Capabilities
- `src/capabilities/workflow/index.ts` — Status transitions with guards
- `src/capabilities/lifecycle/index.ts` — Archive/restore with audit trail
- `src/capabilities/relationship/index.ts` — Group memberships
- `src/capabilities/resource/index.ts` — Generic entity access
- `src/capabilities/security/index.ts` — RBAC evaluation
- `src/capabilities/notification/index.ts` — OneSignal facade
- `src/capabilities/identity/index.ts` — User profiles
- `src/capabilities/organization/index.ts` — Org context management
- `src/capabilities/federation/index.ts` — Multi-org management
- `src/capabilities/policy/index.ts` — Business rules enforcement

### Template System
- `src/templates/schema.ts` — Template interface definition
- `src/templates/church.ts` — Church template implementation
- `src/manifest/index.ts` — Manifest exports
- `src/manifest/compiler.ts` — ManifestCompilerService

### Runtime
- `src/runtime/index.ts` — MinimalRuntime implementation

### Adapters (Legacy Bridge)
- `src/adapters/CaisseAdapter.ts`
- `src/adapters/OrgUnitAdapter.ts`
- `src/adapters/TransactionLegacyAdapter.ts`
- `src/adapters/VersementLegacyAdapter.ts`
- `src/adapters/EventBudgetAdapter.ts`
- `src/capabilities/lifecycle/adapters.ts`

### Infrastructure
- `src/lib/powersync/SupabaseConnector.ts` — PowerSync backend connector
- `src/lib/dataLayer.ts` — Unified data access layer
- `src/lib/orgContext.ts` — Organization context management
- `src/lib/rbac.ts` — RBAC engine (source of truth)
- `powersync/sync-config.yaml` — Sync rules (20 streams)
- `capacitor.config.ts` — Capacitor configuration

### UI
- `src/ionic/routing.tsx` — 48 Ionic routes
- `src/ionic/theme.ts` — Theme configuration
- `src/ionic/theme.css` — CSS tokens
- `src/IonicApp.tsx` — Ionic app wrapper
- `src/pages/` — 38 pages

### Tests
- `src/capabilities/__tests__/` — 14 unit test files
- `e2e-tests/` — 5 E2E test files (649 lines total)

---

## Next Actions

1. **Create second business pack** (`school.ts` or equivalent) to satisfy requirement #16
2. **Extract church-specific logic** from `lib/` into the template system (requirement #8)
3. **Continue page migration** from `useLocalStore` to `dataLayer` (requirement #15)
4. **Run `pnpm test`** to verify all 14 unit tests pass
5. **Run `pnpm test:e2e`** to verify E2E tests pass
