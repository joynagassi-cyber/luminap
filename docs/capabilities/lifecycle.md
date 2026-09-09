# Lifecycle Capability

**Module:** `src/capabilities/lifecycle/index.ts`
**Adapters:** `src/capabilities/lifecycle/adapters.ts`
**Tests:** [`lifecycle.test.ts`](../../src/capabilities/__tests__/lifecycle.test.ts)

## Purpose and Responsibility

The Lifecycle capability manages **archive and restore operations** for entities that support a soft-delete lifecycle. It is the single source of truth for:

- Archiving an entity (setting status to `ARCHIVED` or `CANCELLED`)
- Restoring an entity (setting status back to `ACTIVE` or `PLANIFIED`)
- Writing audit log entries for every archive/restore action
- Validating preconditions via pluggable `LifecyclePolicy`

Events use `CANCELLED` instead of `ARCHIVED` — this is handled transparently by the capability.

## Public API

### Types

```typescript
type ArchivableEntity = 'Group' | 'Event' | 'Member' | 'Account' | 'Category' | 'Role';

type LifecycleStatus = 'ACTIVE' | 'ARCHIVED' | 'CANCELLED';

interface LifecyclePolicy {
  /** Called before archive — must return { ok: true } or throw */
  canArchive(entityId: string, context?: Record<string, any>): Promise<{ ok: boolean; reason?: string }>;
  /** Called before restore — must return { ok: true } or throw */
  canRestore(entityId: string, context?: Record<string, any>): Promise<{ ok: boolean; reason?: string }>;
  /** Optional side-effect after archiving */
  onArchive?: (entityId: string) => Promise<void>;
  /** Optional side-effect after restoring */
  onRestore?: (entityId: string) => Promise<void>;
}
```

### LifecycleService

```typescript
class LifecycleService {
  /** Register a policy for an entity type */
  register(entityType: ArchivableEntity, policy: LifecyclePolicy): void

  /** Get the registered policy (if any) */
  getPolicy(entityType: ArchivableEntity): LifecyclePolicy | undefined

  /** Archive an entity — throws if policy rejects */
  archive(entityType: ArchivableEntity, entityId: string, reason: string, actorId: string): Promise<void>

  /** Restore an entity — throws if policy rejects */
  restore(entityType: ArchivableEntity, entityId: string, reason: string, actorId: string): Promise<void>

  /** List archived/cancelled entries from audit log */
  listArchived(filters?: {
    entityType?: ArchivableEntity;
    period?: { start: string; end: string };
    actorId?: string;
  }): Promise<any[]>

  /** Check if an entity is currently in an active state */
  isLifecycleActive(entityType: ArchivableEntity, entityId: string): Promise<boolean>
}
```

### Entity Table Mapping

| Entity Type | Table | Archive Status | Restore Status |
|---|---|---|---|
| `Group` | `groups` | `ARCHIVED` | `ACTIVE` |
| `Event` | `events` | `CANCELLED` | `PLANIFIED` |
| `Member` | `members` | `ARCHIVED` | `ACTIVE` |
| `Account` | `accounts` | `ARCHIVED` | `ACTIVE` |
| `Category` | `categories` | `ARCHIVED` | `ACTIVE` |
| `Role` | `org_units` | `ARCHIVED` | `ACTIVE` |

## Usage Examples

```typescript
import { lifecycle } from '@/capabilities/lifecycle';

// Register a policy for Groups
lifecycle.register('Group', {
  canArchive: async (entityId) => {
    // Custom rule: groups with active events cannot be archived
    const hasActiveEvents = await checkActiveEvents(entityId);
    if (hasActiveEvents) {
      return { ok: false, reason: 'Group has active events' };
    }
    return { ok: true };
  },
  canRestore: async () => ({ ok: true }),
  onArchive: async (entityId) => {
    // Cascade: also archive child groups
    await archiveChildGroups(entityId);
  },
});

// Archive a group
await lifecycle.archive('Group', 'group-1', 'Merging into another group', 'user-1');

// Restore a group
await lifecycle.restore('Group', 'group-1', 'Reopening after merger', 'user-1');

// Check if a group is still active
const isActive = await lifecycle.isLifecycleActive('Group', 'group-1');

// List all archived groups this year
const archived = await lifecycle.listArchived({
  entityType: 'Group',
  period: { start: '2024-01-01', end: '2024-12-31' },
});
```

## Adapters

The `adapters.ts` file provides thin wrappers for page-level convenience:

```typescript
// src/capabilities/lifecycle/adapters.ts

groupLifecycle.archive(id, reason, actorId)
groupLifecycle.restore(id, reason, actorId)

eventLifecycle.cancel(id, reason, actorId)   // delegates to lifecycle.archive('Event', ...)
eventLifecycle.restore(id, reason, actorId)

memberLifecycle.archive(id, reason, actorId)
memberLifecycle.restore(id, reason, actorId)

accountLifecycle.archive(id, reason, actorId)
accountLifecycle.restore(id, reason, actorId)
```

These adapters exist so that pages can call `groupLifecycle.archive(...)` without knowing about the `LifecycleService` class directly. They are pure delegation — zero business logic.

## Audit Trail

Every `archive()` and `restore()` call writes an entry to the audit log via `auditLogRepo.write()`. The entry contains:

- `action`: `'ARCHIVE'` or `'RESTORE'`
- `entityType` and `entityId`
- `userId` (the actor)
- `beforeState` and `afterState` (full entity snapshots)
- `comment` (the reason passed by the caller)

## Test Coverage

| Test Suite | Tests |
|---|---|
| `register / getPolicy` | 2 — registration, missing policy |
| `archive` | 7 — Group archive, Event cancel, not-found, policy reject, onArchive hook, audit write, no archived_at for Event |
| `restore` | 7 — Group restore, Event restore to PLANIFIED, not-found, policy reject, onRestore hook, audit write, clear archive fields |
| `listArchived` | 5 — filter by action type, empty, entityType, actorId, period |
| `isLifecycleActive` | 5 — ACTIVE, ARCHIVED, CANCELLED, missing, PLANIFIED |

Total: **26 tests**

### Key Test Scenarios

- **Policy gate**: `canArchive` returning `{ ok: false }` causes `archive()` to throw
- **Event special case**: Events use `CANCELLED` status and do not set `archivedAt`/`archivedBy`/`archiveReason`
- **Audit completeness**: Before/after states are captured and persisted
- **Restore clears fields**: `archived_at`, `archived_by`, `archive_reason` are set to NULL on restore
- **Idempotent check**: `isLifecycleActive` returns `false` for both `ARCHIVED` and `CANCELLED` entities

## Integration Points

- `src/lib/audit.ts` — writes audit entries
- `src/lib/powersync.ts` — performs DB updates
- `src/lib/orgContext.ts` — reads current organization for multi-tenant isolation
- Pages: `GroupDetail.tsx`, `MemberDetail.tsx` call through the adapter layer
