# Resource Capability

**Module:** `src/capabilities/resource/index.ts`
**Tests:** [`resource.test.ts`](../../src/capabilities/__tests__/resource.test.ts)

## Purpose and Responsibility

The Resource capability provides a **generic, typed query layer** over PowerSync entities. It abstracts away SQL construction, table name resolution, and snake_case-to-camelCase conversion, giving pages a consistent interface for reading entities.

It does NOT handle writes — that is the responsibility of the data layer (`src/lib/dataLayer.ts`). It also does not handle lifecycle transitions — that is the Lifecycle capability's responsibility.

## Public API

### Types

```typescript
type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

interface FilterCondition {
  field: string;
  op: FilterOp;
  value: any;
}

interface ResourceQuery {
  filter?: FilterCondition[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface ResourceResult<T = any> {
  items: T[];
  total: number;
  hasNext: boolean;
}
```

### ResourceService

```typescript
class ResourceService {
  /** Get a single entity by type and id */
  get<T extends { id: string }>(entityType: string, id: string): Promise<T | null>

  /** List entities with filtering, sorting, and pagination */
  list<T extends { id: string }>(
    entityType: string,
    query?: ResourceQuery
  ): Promise<ResourceResult<T>>

  /** List entities filtered by a specific status */
  listByStatus<T extends { id: string }>(
    entityType: string,
    status: string
  ): Promise<T[]>

  /** List archived/cancelled entities */
  listArchived<T extends { id: string }>(
    entityType: string,
    query?: ResourceQuery
  ): Promise<ResourceResult<T>>

  /** Check if an entity exists */
  exists(entityType: string, id: string): Promise<boolean>
}
```

### Entity-to-Table Mapping

| Entity Type | Table Name |
|---|---|
| `Group` | `groups` |
| `Event` | `events` |
| `Member` | `members` |
| `Account` | `accounts` |
| `Category` | `categories` |
| `Role` | `org_units` |

Any unrecognized entity type is lowercased (e.g., `'Cotisation'` -> `'cotisation'`).

## Usage Examples

```typescript
import { resource } from '@/capabilities/resource';

// Get a single group
const group = await resource.get('Group', 'group-1');

// List all groups (org-scoped automatically)
const allGroups = await resource.list('Group');

// List active groups, sorted by name descending, paginated
const activeGroups = await resource.list('Group', {
  filter: [{ field: 'status', op: 'eq', value: 'ACTIVE' }],
  sortBy: 'name',
  sortOrder: 'desc',
  limit: 20,
  offset: 0,
});

// List archived groups
const archived = await resource.listArchived('Group');

// List cancelled events
const cancelledEvents = await resource.listArchived('Event');

// Check existence
const exists = await resource.exists('Group', 'group-999');

// List by status
const activeMembers = await resource.listByStatus('Member', 'ACTIVE');
```

## Filter Operators

| Operator | SQL Equivalent | Example |
|---|---|---|
| `eq` | `= ?` | `{ field: 'status', op: 'eq', value: 'ACTIVE' }` |
| `neq` | `!= ?` | `{ field: 'status', op: 'neq', value: 'ARCHIVED' }` |
| `gt` | `> ?` | `{ field: 'amount', op: 'gt', value: 10000 }` |
| `gte` | `>= ?` | `{ field: 'amount', op: 'gte', value: 10000 }` |
| `lt` | `< ?` | `{ field: 'amount', op: 'lt', value: 10000 }` |
| `lte` | `<= ?` | `{ field: 'amount', op: 'lte', value: 10000 }` |
| `contains` | `LIKE '%?%'` | `{ field: 'name', op: 'contains', value: 'Alpha' }` |
| `in` | `IN (?, ?, ?)` | `{ field: 'status', op: 'in', value: ['ACTIVE', 'PLANIFIED'] }` |

## Test Coverage

| Test Suite | Tests |
|---|---|
| `get` | 3 — found, not found, snake_case to camelCase |
| `list` | 9 — default, eq filter, neq, contains, sort asc/desc, pagination, empty |
| `listByStatus` | 3 — ACTIVE, ARCHIVED, non-existent status |
| `listArchived` | 5 — ARCHIVED groups, CANCELLED events, empty, additional filters, total/hasNext |
| `exists` | 2 — true, false |

Total: **22 tests**

### Key Test Scenarios

- **snake_case conversion**: DB columns like `org_id` are returned as `orgId` in the result
- **Org scoping**: All queries automatically include `WHERE org_id = ?` using the current org context
- **Pagination**: `hasNext` is true when `items.length >= limit`
- **Archived for Events**: `listArchived('Event')` looks for `CANCELLED` status, not `ARCHIVED`

## Architecture Notes

- The capability is **read-only** — all mutations go through the data layer or specific capability services
- `total` in `ResourceResult` is the count *before* pagination (useful for UI pagination controls)
- `listArchived` does not support offset/limit pagination (returns all archived items)
- The `toResource()` private method applies the snake_case-to-camelCase transformation consistently across all query results
