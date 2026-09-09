# Legacy to Capability Pattern — Migration Guide

> Date: 2026-09-09
> Status: In progress — tranches 0-10 committed, capabilities 5 active
> Scope: Migrating `useLocalStore.ts` (monolith) → 12 domain capabilities

---

## 1. Why Migrate

The monolithic Zustand store (`useLocalStore.ts`, ~1100 lines) mixes state management, business logic, and infrastructure concerns. The capability pattern separates each concern:

| Concern | Before | After |
|---------|--------|-------|
| Business rules | Inside store methods | Inside capability guards |
| State persistence | `useState` in store | PowerSync (single source of truth) |
| Cross-cutting concerns | Duplicated in each method | Capability intercepts via registry |
| Testability | Full store mock needed | Capability unit-testable in isolation |

---

## 2. The Capability Pattern

A capability is a singleton service with a domain-specific interface that:

1. **Owns its data access** (PowerSync queries, not Zustand state)
2. **Enforces its own invariants** (guards, policy checks)
3. **Has a clear surface** (interface the UI consumes)
4. **Is independent** of the store (store delegates to it)

```
Before:
  UI Page → useLocalStore.addTransaction() → dataLayer.addTransactionPS() → PowerSync
           → useLocalStore.transactions (derived state, stale)

After:
  UI Page → useLocalStore.addTransaction() → workflow.check() → transactionService()
           → dataLayer.addTransactionPS() → PowerSync
           → useLocalStore.transactions (live via dataLayer hook)
```

---

## 3. Migration Patterns

### Pattern A: Guard Injection (Workflow Seam)

Extract status-transition guards from store methods into the workflow capability registry.

**Before:**
```typescript
// src/store/useLocalStore.ts — inside updateTransaction
if (tx.status === 'APPROVED') {
  set((s) => ({ error: 'Transaction APPROVED is immutable' }));
  return;
}
```

**After:**
```typescript
// src/capabilities/workflow/index.ts
export const transactionGuard: WorkflowGuard = (current, target) => {
  if (current === 'APPROVED' && target !== 'APPROVED') {
    return { allowed: false, reason: 'TRANSACTION_APPROVED_IMMUTABLE' };
  }
  return { allowed: true };
};
workflow.register('transaction', transactionGuard);

// src/store/useLocalStore.ts — now delegates
const guardResult = workflow.check('transaction', tx.status, newStatus);
if (!guardResult.allowed) {
  set({ error: guardResult.reason });
  return;
}
```

### Pattern B: Adapter Bridge (Resource Seam)

Keep the legacy `caisses` table feeding the UI while reading from canonical `accounts`.

**Before:**
```typescript
// UI reads from caisses directly — duplicated with accounts table
const caisses = useLocalStore().caisses;
```

**After:**
```typescript
// src/adapters/CaisseAdapter.ts — merges both sources
export class CaisseAdapter {
  static merge(caisses: Caisse[], accounts: Account[]): Caisse[] {
    const map = new Map<string, Caisse>();
    caisses.forEach(c => map.set(c.id, c));
    accounts.forEach(a => {
      if (!map.has(a.id)) map.set(a.id, CaisseAdapter.fromAccount(a));
    });
    return Array.from(map.values());
  }
}

// Store uses adapter — UI unchanged
const caisses = CaisseAdapter.merge(localCaisses, accounts);
```

### Pattern C: Service Extraction (Activity Seam)

Move business logic functions out of the store into their own service, called by the store.

**Before:**
```typescript
// src/store/useLocalStore.ts — 40 lines of cotisation logic inside the store
async markCotisationPaid(id: string, orgId: string) {
  const cotisation = this.cotisations.find(c => c.id === id);
  if (!cotisation) return;
  const culte = this.cultes.find(c => c.id === cotisation.culteId);
  if (!culte) return;
  // ... 30 more lines of logic
}
```

**After:**
```typescript
// src/lib/cotisation-service.ts — pure business logic
export function markCotisationPaid(
  cotisations: Cotisation[],
  cultes: Culte[],
  id: string,
  actorId: string
): { cotisation: Cotisation; culte: Culte } {
  // ... logic isolated
}

// src/store/useLocalStore.ts — thin wrapper
async markCotisationPaid(id: string) {
  const result = markCotisationPaid(this.cotisations, this.cultes, id, this.user.id);
  // ... persist
}
```

### Pattern D: Policy Registration (Lifecycle Seam)

Replace inline archive checks with a policy registry.

**Before:**
```typescript
// src/store/useLocalStore.ts — inline archive logic scattered
async archiveGroup(id: string) {
  // check permissions, check transactions, update status
  await db.execute(`UPDATE groups SET status='ARCHIVED' WHERE id=?`, [id]);
}
```

**After:**
```typescript
// src/capabilities/lifecycle/index.ts — policy-registered
lifecycle.register('Group', {
  canArchive: async (id) => {
    const group = await resource.get<Group>('Group', id);
    if (!group) return { ok: false, reason: 'Group not found' };
    // domain rules here
    return { ok: true };
  },
  onArchive: async (id) => {
    // cascading side-effects
  }
});

// Store calls capability
async archiveGroup(id: string) {
  await lifecycle.archive('Group', id, 'manual', this.user.id);
}
```

### Pattern E: Facade Wrapper (Forms / Audit / Notification)

Create a capability facade that delegates to existing modules without changing the modules.

**Before:**
```typescript
// Pages import directly from modules
import { auditLogRepo } from '@/lib/audit';
import { formSystem } from '@/lib/formSystem';
import { oneSignal } from '@/lib/onesignal';
```

**After:**
```typescript
// src/capabilities/audit/AuditCapability.ts — facade
export class AuditCapability {
  static async write(action: string, entity: string, id: string, comment?: string) {
    return auditLogRepo.write({ /* map params */ });
  }
}

// Pages import from capability — future-proof
import { audit } from '@/capabilities/audit';
```

---

## 4. Migration Checkpoints

### Checkpoint 0 — Bug Fixes (DONE)
- [x] `isPaiementVerrouille` implemented in `cotisation-logic.ts`
- [x] Dead import `checkPermission` removed from `useLocalStore.ts`
- [x] Archive mapping `Account → 'accounts'` corrected

### Checkpoint 1 — Organization Context (DONE)
- [x] `OrganizationContext` created at `src/context/OrganizationContext.tsx`
- [x] `orgContext.ts` service with `getOrganizationId()` created
- [x] 6 services migrated off hardcoded `org-1`
- [ ] Remaining ~23 occurrences in `useLocalStore.ts` — progressive migration
- [ ] ~10 occurrences in pages — deferred to Tranche 11+

### Checkpoint 2 — Transaction Immutability (DONE)
- [x] `workflow` capability created with `transactionGuard`
- [x] 5 guards in `dataLayer.ts` (update, delete, batchDelete)
- [x] UI pages check `workflow.check()` before mutation
- [x] PowerSync layer also enforces guard (defense in depth)

### Checkpoint 4 — Adapters (DONE — PREPARED)
- [x] `CaisseAdapter` created (`src/adapters/CaisseAdapter.ts`)
- [x] `OrgUnitAdapter` created (`src/adapters/OrgUnitAdapter.ts`)
- [x] `TransactionLegacyAdapter` created
- [x] `VersementLegacyAdapter` created
- [x] `EventBudgetAdapter` created
- [ ] None have active consumers yet — waiting for domain seam activation

### Checkpoint 5 — Resource Seam (DONE)
- [x] `resource` capability with generic `get/list/listArchived` created
- [x] `dataLayer.ts` hooks: `useGroups`, `useMembers`, `useEvents`
- [x] `Archives.tsx` uses `resource.listArchived()`

### Checkpoint 6 — OfflineSync (DONE)
- [x] `sync-config.yaml` with 20 streams
- [x] `dataLayer.ts` PowerSync hooks for accounts, groups, members, events
- [ ] 10 handlers for versements, forms, customFields, reports — still incomplete

### Checkpoint 7 — RBAC (PARTIAL)
- [x] `security` capability created with `hasRole()` / `hasPermission()`
- [x] 3 pages use `security.hasRole()` gates (TransactionDetail, Groups, EventDetail)
- [ ] `checkPermission()` in `rbac.ts` is still a stub — returns `true`
- [ ] `security/index.ts` duplicates `rbac.ts` — de-duplication needed

### Checkpoint 8 — Lifecycle (DONE)
- [x] `lifecycle` capability with policy registry created
- [x] `Archives.tsx` uses `lifecycle.archive()` / `lifecycle.restore()`
- [x] Archive mapping `Account → 'accounts'` verified
- [ ] `lifecycle.register()` not called from store yet (double-write risk)

### Checkpoint 9 — Reporting (DONE)
- [x] `reporting.ts` uses `getPowerSyncDatabase()` instead of IndexedDB
- [x] `reportEngine` singleton functional
- [ ] `ReportingCapability` facade not yet created

### Checkpoint 10 — Versement Canonique (PARTIAL)
- [x] `createVersement` function exists in `versement-service.ts`
- [ ] Line 375 in `useLocalStore.ts` still has hardcoded `org-1` — needs `getOrganizationId()`

---

## 5. Capability Inventory

| Capability | Status | Score | Consumers |
|-----------|--------|-------|-----------|
| `workflow` | ACTIVE | 25/35 | 3 (store) |
| `lifecycle` | ACTIVE | 25/35 | 8+ (store + Archives) |
| `resource` | ACTIVE | 26/35 | 3 (Archives) |
| `relationship` | WRAPPER | 18/35 | 2 (store) |
| `security` | PREPARATION | 22/35 | 5 (3 pages) |
| `identity` | PREPARATION | — | 0 (stub, auth via Supabase) |
| `organization` | ACTIVE | — | store, services |
| `notification` | PLANNED | — | 0 |
| `forms` | PLANNED | — | 0 |
| `audit` | PLANNED | — | 0 (direct imports still) |
| `offline` | PLANNED | — | 0 (dataLayer still direct) |

---

## 6. Next Priority: Security De-duplication

The most impactful next step is resolving the `security/index.ts` ↔ `rbac.ts` duplication.

**Problem:**
- Both files define `PERMISSION_MATRIX`, `ROLE_LABELS`, `ROLE_HIERARCHY`
- `security` has church-specific methods (`isSpiritualLeader`, `canManageFinance`)
- `rbac.ts`'s `canAccess()` is never called — the 3 pages use `security.hasRole()` directly

**Action:**
1. Decide source of truth: `security` or `rbac.ts`
2. Remove duplicate constants from the other
3. Move `cotisation:manage`, `PASTEUR_*` roles to a church domain policy (not in the universal capability)
4. Wire `checkPermission()` to call the single source

---

## 7. Anti-Patterns to Avoid

| Anti-pattern | Example | Fix |
|-------------|---------|-----|
| Store calling capability then re-setting Zustand state | `lifecycle.archive()` + `set(s => ({ groups: ... }))` | Store should not double-write; let capability or dataLayer own the state update |
| Capability calling store | `workflow.check()` inside store method | Inversion: store calls capability, never the reverse |
| Hardcoded org in capability | `orgId: 'org-1'` in `resource.ts` | Use `getOrganizationId()` — already done in all capabilities |
| Adapter with side effects | `CaisseAdapter.merge()` writes to DB | Adapters are pure; they only transform data |

---

*This guide is living — update checkpoints as tranches complete.*
