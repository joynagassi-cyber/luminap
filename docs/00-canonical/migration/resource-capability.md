# Resource Capability — Generic Entity Access

**Status:** Created, 0 consumers (PREPARED)  
**File:** `src/capabilities/resource/index.ts` (218 lines)  
**Commit:** pending

## Purpose

Generic typed access to any PowerSync entity through a single interface:

```typescript
import { resource } from '@/capabilities/resource'

// Get single entity
const group = await resource.get<Group>('Group', id)

// List with filters
const result = await resource.list<Group>('Group', {
  filter: [{ field: 'status', op: 'eq', value: 'ACTIVE' }]
})

// List archived
const archived = await resource.listArchived<Group>('Group')
```

## API

| Method | Description |
|--------|-------------|
| `get<T>(entityType, id)` | Single entity by id |
| `list<T>(entityType, query?)` | Filtered list with pagination |
| `listArchived<T>(entityType, query?)` | Archived/cancelled entities |
| `exists(entityType, id)` | Existence check |

## Table Mapping

| EntityType | Table | Archive Status |
|------------|-------|----------------|
| Group | `groups` | ARCHIVED |
| Event | `events` | CANCELLED |
| Member | `members` | ARCHIVED |
| Account | `accounts` | ARCHIVED |
| Category | `categories` | ARCHIVED |
| Role | `org_units` | ARCHIVED |

## Current State

- **No consumers yet** — all pages still use dataLayer hooks directly
- **Architecture sound** — ready to replace `g.status === 'ARCHIVED'` patterns
- **Type-safe** — generic `<T>` for typed results
- **Snake_case → camelCase** — automatic column mapping

## Next Consumer

`Archives.tsx` is the natural first consumer:
```typescript
// Current (direct filtering)
const archivedGroups = groups.filter((g: any) => g.status === 'ARCHIVED');

// Target (capability)
const result = await resource.listArchived<Group>('Group');
const archivedGroups = result.items;
```

---
