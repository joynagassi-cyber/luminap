# Database Query Performance Audit

**Date:** 2026-09-09
**Scope:** src/lib/ -- PowerSync queries, schema indexes, N+1 patterns
**Status:** Draft -- findings documented, fixes not yet applied

---

## 1. Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| Missing PowerSync indexes | 18 | HIGH |
| N+1 query patterns | 3 | HIGH |
| Critical bugs in queries | 1 | BLOCKER |
| Inefficient query patterns | 4 | MEDIUM |
| Unused query parameters | 2 | LOW |

**Total issues: 28**

---

## 2. Missing Indexes in PowerSync Schema

### 2.1 Schema vs IndexedDB vs Supabase Disparity

The PowerSync `AppSchema` in `src/lib/powersync/schema.ts` declares **every table with `{ indexes: {} }`** (empty). This means PowerSync's local SQLite database has **zero secondary indexes** beyond the implicit primary key.

Meanwhile, `docs/DB-INDEX-COMPARISON.md` confirms Supabase cloud and IndexedDB both have secondary indexes, but those indexes are **not mirrored into the PowerSync schema**, so they do not exist in the local SQLite database either.

### 2.2 Missing Indexes by Table

#### transactions (CRITICAL -- most queried table)
- `org_id` -- every `useQuery` filters by org implicitly via RLS; local queries should have it
- `status` -- filtered in `getAccountBalance`, `reporting.ts`, `export.ts`
- `source_caisse_id` -- filtered in `account.ts`, `export.ts`
- `versement_id` -- filtered in `export.ts` versement lookups
- `event_id` -- filtered in `export.ts` event budget queries
- `category_id` -- filtered in `export.ts`
- **Composite `org_id, status`** -- used by `SELECT * FROM transactions WHERE status = ?` plus org filter
- **Composite `org_id, source_caisse_id`** -- used by `getAccountBalance`
- **Composite `org_id, event_id`** -- used by export event queries
- **Composite `org_id, type, status`** -- used by income/expense aggregation in export

#### members
- `org_id` -- every members query is org-scoped
- `status` -- filtered for ACTIVE members in `createCulte`, `getMembresEnAvance`
- **Composite `org_id, status`** -- used by `createCulte` (`WHERE org_id = ? AND status = 'ACTIVE'`)

#### events
- `org_id` -- every events query is org-scoped
- `type` -- filtered for CULTE type in cotisation flows
- **Composite `org_id, type`** -- used by cotisation services

#### notifications
- `org_id` -- org-scoped
- `source_transaction_id` -- filtered in `useNotifications`

#### caisses
- `org_id` -- org-scoped queries
- `status` -- filtered in group lifecycle

#### accounts
- `org_id` -- org-scoped
- `owner_type` / `owner_id` -- composite index needed for ownership lookups

#### versements
- `org_id` -- org-scoped
- `from_account_id` -- filtered in export
- `to_account_id` -- filtered in export
- `status` -- filtered in queries

#### audit_entries (HIGH VOLUME table)
- `org_id` -- org-scoped
- `entity_type` -- filtered in `auditLogRepo.list`
- `entity_id` -- filtered in `auditLogRepo.getByEntity`
- `user_id` -- filtered in `auditLogRepo.list`
- `action` -- filtered in `auditLogRepo.list`
- `created_at` -- ORDER BY used in all audit queries
- **Composite `org_id, entity_type, entity_id`** -- common lookup pattern

#### group_memberships
- `member_id` -- filtered everywhere groups are looked up
- `group_id` -- filtered everywhere groups are looked up
- **Composite `member_id, group_id`** -- natural lookup

#### event_budgets
- `event_id` -- lookup by event

#### budget_lines
- `event_budget_id` -- lookup by budget
- `category_id` -- filtered in queries

#### org_units
- `org_id` -- org-scoped
- `is_active` -- filtered in some queries

#### report_definitions
- `org_id` -- org-scoped

#### custom_field_definitions
- `entity_type` -- filtered in `listCustomFieldDefinitionsPS`
- `org_id` -- org-scoped

#### custom_field_values
- `entity_type, entity_id` -- filtered in `getCustomFieldValuesByEntityPS`
- **Composite `entity_type, entity_id`** -- already declared in IndexedDB comparison

---

## 3. N+1 Query Patterns

### 3.1 getMembreHistorique -- N+1 via .find() in map

**File:** `src/lib/cotisation-service.ts:351-356`

```typescript
export function getMembreHistorique(
  membreId: string,
  state: CotisationState
): { cotisation: Cotisation; culte: Event | undefined }[] {
  const cotisations = state.cotisations.filter(c => c.membreId === membreId);
  return cotisations
    .map(cot => {
      const culte = state.events.find(e => e.id === cot.culteId);  // N+1
      return { cotisation: cot, culte };
    })
    ...
}
```

**Problem:** For each cotisation record, `.find()` iterates the entire events array. With N cotisations and M events, this is O(N*M).

**Fix:** Pre-build a Set or Map of event IDs, or do a single pass:
```typescript
const eventMap = new Map(state.events.map(e => [e.id, e]));
return cotisations.map(cot => ({
  cotisation: cot,
  culte: eventMap.get(cot.culteId),
})).filter(({ culte }) => culte !== undefined);
```

### 3.2 persistCulte -- Loop of Sequential INSERTs

**File:** `src/lib/cotisation-service.ts:113-129`

```typescript
for (const cot of cotisations) {
  await executeWrite(
    'INSERT INTO cotisations (...) VALUES (...)',
    [...]
  );
}
```

**Problem:** Each cotisation insertion is a separate synchronous write. With 50 members, that is 50 round-trips through PowerSync's transaction pipeline.

**Fix:** Batch into a single transaction:
```typescript
await db.transaction(tx => {
  for (const cot of cotisations) {
    tx.execute(
      'INSERT INTO cotisations (...) VALUES (...)',
      [...]
    );
  }
});
```

### 3.3 persistMarkCotisationsAbsent -- Loop of Sequential UPDATEs

**File:** `src/lib/cotisation-service.ts:307-311`

```typescript
for (const cot of state.cotisations) {
  if (cot.culteId === culteId && membreIds.includes(cot.membreId)) {
    await updateCotisationPS(cot.id, { statut: 'ABSENT', updatedAt: now });
  }
}
```

**Problem:** Same N+1 pattern -- one UPDATE per affected cotisation. `membreIds.includes()` is O(M) per iteration.

**Fix:** Convert `membreIds` to a Set, then batch:
```typescript
const memberIdSet = new Set(membreIds);
const toUpdate = state.cotisations.filter(
  cot => cot.culteId === culteId && memberIdSet.has(cot.membreId)
);
// Then batch UPDATE via a single transaction
```

---

## 4. Critical Bug

### 4.1 updateCustomFieldDefinitionPS -- Wrong Table in UPDATE

**File:** `src/lib/dataLayer.ts:1306-1307`

```typescript
if (data.options !== undefined) { setClauses.push('options = ?'); params.push(JSON.stringify(data.options)); }
if (data.order !== undefined) { setClauses.push('order = ?'); params.push(data.order); }
setClauses.push('updated_at = ?');
params.push(new Date().toISOString());
params.push(id);
await executeWrite(
  `UPDATE form_submissions SET ${setClauses.join(', ')} WHERE id = ?`,  // BUG: writes to form_submissions instead of custom_field_definitions
  params
);
```

**Impact:** Updating a custom field definition silently updates a form submission record instead. This is data corruption.

**Fix:** Change `form_submissions` to `custom_field_definitions` on line 1307.

---

## 5. Inefficient Query Patterns

### 5.1 executeWrite Called Outside React Component Context

**File:** `src/lib/dataLayer.ts:632-639`

```typescript
export async function executeWrite(sql: string, params: any[] = []): Promise<number> {
  const sync = usePowerSync();  // React hook called outside component!
  const result = await sync.execute(sql, params);
  return result.changes;
}
```

**Problem:** `usePowerSync()` is a React hook being called from a plain function `executeWrite`, which is invoked from services like `cotisation-service.ts`, `transaction-service.ts`, etc. This works only because the call site happens to be inside a React component's render cycle or a React event handler, but it is **not guaranteed** and will break if called from non-React contexts (e.g., Web Workers, background sync).

**Fix:** Use the singleton `getPowerSyncDatabase()` or store the sync instance in a module-level variable:
```typescript
// In dataLayer.ts, replace usePowerSync() with the singleton
import { getPowerSyncDatabase } from '@/lib/powersync';

export async function executeWrite(sql: string, params: any[] = []): Promise<number> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(sql, params);
  return result.changes;
}
```

### 5.2 SELECT * FROM transactions in reporting.ts

**File:** `src/lib/reporting.ts:43`

```typescript
const result = await db.execute('SELECT * FROM transactions WHERE status = ?', ['APPROVED']);
```

**Problem:** Fetches all columns of all approved transactions, then applies in-memory filtering by date range, sourceCaisseId, categoryId, and type. This transfers far more data than needed.

**Fix:** Push filters into SQL where possible:
```typescript
const conditions = ['status = ?'];
const params: any[] = ['APPROVED'];
if (filters.startDate) { conditions.push('date >= ?'); params.push(filters.startDate); }
if (filters.endDate) { conditions.push('date <= ?'); params.push(filters.endDate); }
if (filters.sourceCaisseId) { conditions.push('source_caisse_id = ?'); params.push(filters.sourceCaisseId); }
// ... etc
const sql = `SELECT * FROM transactions WHERE ${conditions.join(' AND ')}`;
```

### 5.3 getAccountBalance -- Fetch All, Then Filter

**File:** `src/lib/account.ts:16`

```typescript
const result = await db.execute('SELECT * FROM transactions WHERE source_caisse_id = ? AND status = ?', [accountId, 'APPROVED']);
const approved: any[] = result?.result || [];
const income = approved.filter((t: any) => t.type === 'INCOME').reduce(...);
const expense = approved.filter((t: any) => t.type === 'EXPENSE').reduce(...);
```

**Problem:** Fetches ALL approved transactions for a caisse, then filters in-memory. With many transactions this transfers unnecessary data.

**Fix:** Use aggregate SQL query:
```typescript
const result = await db.execute(
  `SELECT 
    COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
   FROM transactions 
   WHERE source_caisse_id = ? AND status = ?`,
  [accountId, 'APPROVED']
);
const row = result?.result?.[0];
return (row?.income || 0) - (row?.expense || 0);
```

### 5.4 auditLogRepo.list -- Full Table Scan When Filtered

**File:** `src/lib/audit.ts:67-101`

```typescript
let query = 'SELECT * FROM audit_entries';
// ... builds conditions
query += ' ORDER BY created_at DESC';
```

**Problem:** Without indexes on `entity_type`, `entity_id`, `user_id`, `action`, and `created_at`, every filtered query does a full table scan. Audit entries grow monotonically and this will degrade significantly.

**Fix:** Add indexes to the schema (see section 2.2).

---

## 6. Unused/Dead Query Parameters

### 6.1 useQuery Hooks Ignoring org_id Filter

**File:** `src/lib/dataLayer.ts` (all `useQuery` hooks)

```typescript
export function useTransactions() {
  const { data: psData } = useQuery<PSTransaction>(
    'SELECT * FROM transactions ORDER BY created_at DESC',  // No WHERE org_id = ?
    [],
    ...
  );
}
```

**Problem:** Every `useQuery` hook fetches ALL rows across ALL organizations, relying entirely on Supabase Row-Level Security (RLS) to filter. This means:
- Data from other orgs is synced to the device unnecessarily
- The client has no way to query cross-org (by design, but RLS alone is the only guard)
- If RLS is ever misconfigured, data leaks across orgs

**Fix:** Add org_id parameter to every query:
```typescript
// Need to pass orgId from context into the hook
const { data: psData } = useQuery<PSTransaction>(
  'SELECT * FROM transactions WHERE org_id = ? ORDER BY created_at DESC',
  [getOrganizationId()],  // Pass current org
  ...
);
```

### 6.2 useQuery Hooks Ignore psStatus Variable

**File:** `src/lib/dataLayer.ts:262, 281, etc.`

```typescript
const { data: psData, status: psStatus } = useQuery<PSTransaction>(...);
// psStatus is declared but never used
```

**Problem:** The `psStatus` variable (indicating `loading`/`loaded`/`error`) is captured but never used to drive UI state or error handling.

**Fix:** Either use `psStatus` for proper loading/error states, or remove the unused variable.

---

## 7. Recommended Index Additions for schema.ts

The following indexes should be added to `src/lib/powersync/schema.ts` to match the existing Supabase/IndexedDB indexes and cover all known query patterns:

```typescript
// members
{ indexes: { idx_members_org: ['org_id'], idx_members_status: ['status'], idx_members_org_status: ['org_id', 'status'] } }

// transactions
{ indexes: {
    idx_tx_org: ['org_id'],
    idx_tx_status: ['status'],
    idx_tx_source_caisse: ['source_caisse_id'],
    idx_tx_versement: ['versement_id'],
    idx_tx_reversal: ['reversal_of_id'],
    idx_tx_event: ['event_id'],
    idx_tx_category: ['category_id'],
    idx_tx_org_status: ['org_id', 'status'],
    idx_tx_org_source: ['org_id', 'source_caisse_id'],
    idx_tx_org_event: ['org_id', 'event_id'],
  } }

// events
{ indexes: { idx_events_org: ['org_id'], idx_events_type: ['type'], idx_events_org_type: ['org_id', 'type'] } }

// notifications
{ indexes: { idx_notif_org: ['org_id'], idx_notif_source_tx: ['source_transaction_id'] } }

// caisses
{ indexes: { idx_caisses_org: ['org_id'] } }

// accounts
{ indexes: { idx_accounts_org: ['org_id'], idx_accounts_owner: ['owner_type', 'owner_id'] } }

// versements
{ indexes: {
    idx_versements_org: ['org_id'],
    idx_versements_from: ['from_account_id'],
    idx_versements_to: ['to_account_id'],
    idx_versements_status: ['status'],
  } }

// audit_entries
{ indexes: {
    idx_audit_org: ['org_id'],
    idx_audit_entity: ['entity_type', 'entity_id'],
    idx_audit_user: ['user_id'],
    idx_audit_action: ['action'],
    idx_audit_created: ['created_at'],
  } }

// group_memberships
{ indexes: { idx_gm_member: ['member_id'], idx_gm_group: ['group_id'] } }

// event_budgets
{ indexes: { idx_eb_event: ['event_id'] } }

// budget_lines
{ indexes: { idx_bl_budget: ['event_budget_id'], idx_bl_category: ['category_id'] } }

// org_units
{ indexes: { idx_ou_org: ['org_id'], idx_ou_active: ['is_active'] } }

// report_definitions
{ indexes: { idx_rd_org: ['org_id'] } }

// custom_field_definitions
{ indexes: { idx_cfd_entity: ['entity_type'], idx_cfd_org: ['org_id'] } }

// custom_field_values
{ indexes: { idx_cfv_entity: ['entity_type', 'entity_id'] } }
```

---

## 8. Priority Action Items

| Priority | Issue | File | Effort |
|----------|-------|------|--------|
| P0 | Bug: updateCustomFieldDefinitionPS writes to wrong table | `dataLayer.ts:1307` | 5 min |
| P0 | Missing indexes on transactions table | `schema.ts` | 15 min |
| P1 | executeWrite calls React hook outside component | `dataLayer.ts:636` | 10 min |
| P1 | Missing indexes on audit_entries, members, events | `schema.ts` | 15 min |
| P1 | N+1: getMembreHistorique .find() in map | `cotisation-service.ts:354` | 10 min |
| P2 | N+1: persistCulte sequential INSERTs | `cotisation-service.ts:113` | 20 min |
| P2 | N+1: persistMarkCotisationsAbsent sequential UPDATEs | `cotisation-service.ts:307` | 15 min |
| P2 | Inefficient: getAccountBalance fetch-all-then-filter | `account.ts:16` | 10 min |
| P2 | Inefficient: reporting.ts full scan + in-memory filter | `reporting.ts:43` | 20 min |
| P3 | Missing org_id filter in all useQuery hooks | `dataLayer.ts` (all hooks) | 30 min |
| P3 | Unused psStatus in all useQuery hooks | `dataLayer.ts` (all hooks) | 10 min |

---

## 9. Schema Change Migration Note

Adding indexes to `schema.ts` does not automatically add them to existing local databases. A schema migration (incrementing `schema.version`) is required:

```typescript
// In schema.ts, bump the Schema version
export const AppSchema = new Schema({ /* tables */ }, { version: 5 }); // current: 4
```

Then add a migration callback to `initPowerSync()` or the database initialization path to run:

```sql
CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
-- ... etc for all new indexes
```

See `docs/DB-INDEX-COMPARISON.md` for the existing migration pattern (version 3 -> 4).
