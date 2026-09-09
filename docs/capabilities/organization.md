# Organization Capability

**Module:** `src/capabilities/organization/index.ts`
**Tests:** [`organization.test.ts`](../../src/capabilities/__tests__/organization.test.ts)

## Purpose and Responsibility

The Organization capability manages **organizational context and unit hierarchy**. It provides the current org identity for multi-tenant isolation and supports a tree of organizational units (departments, teams, branches) within each organization.

It delegates the current org ID to `src/lib/orgContext.ts` as the source of truth.

## Public API

### Types

```typescript
interface OrgContext {
  /** Organization identifier */
  orgId: string;
  /** Organization display name */
  orgName: string;
  /** User's role within the organization */
  role: string;
}

interface OrgUnit {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Parent unit id, if nested */
  parentId: string | null;
  /** Organization this unit belongs to */
  orgId: string;
}
```

### OrganizationService

```typescript
class OrganizationService {
  /** Get the current organization context */
  getContext(): OrgContext

  /** Switch to a different organization */
  switchOrg(newOrgId: string): Promise<void>

  /** Get all org units for the current organization */
  getOrgUnits(): Promise<OrgUnit[]>

  /** Register an org with a display name */
  registerOrg(orgId: string, name: string): void

  /** Add an org unit */
  addOrgUnit(unit: OrgUnit): void

  /** Remove an org unit by id */
  removeOrgUnit(orgId: string, unitId: string): boolean

  /** List all registered organizations */
  listOrgs(): Array<{ orgId: string; name: string }>
}
```

## Usage Examples

```typescript
import { organization } from '@/capabilities/organization';

// Get current context
const ctx = organization.getContext();
console.log(ctx.orgId, ctx.orgName); // 'org-1', 'Acme Corp'

// Switch organizations
await organization.switchOrg('org-2');

// Manage org units (hierarchical)
organization.addOrgUnit({ id: 'u1', name: 'Engineering', parentId: null, orgId: 'org-1' });
organization.addOrgUnit({ id: 'u2', name: 'Frontend', parentId: 'u1', orgId: 'org-1' });

const units = await organization.getOrgUnits(); // filtered to current org

// List all registered orgs
const allOrgs = organization.listOrgs();
```

## Test Coverage

| Test Suite | Tests |
|---|---|
| `getContext` | 5 -- orgId from context, default name, registered name, default role, shape |
| `switchOrg` | 2 -- updates context, changes getContext result |
| `getOrgUnits` | 5 -- empty, returns units, filters by current org, shape, nested units |
| `registerOrg` | 2 -- registers name, updates getContext |
| `addOrgUnit` | 2 -- stores new unit, appends to existing |
| `removeOrgUnit` | 3 -- removes and returns true, not-found, does not affect other orgs |
| `listOrgs` | 2 -- empty, all registered |
| Contract + domain-agnostic | 6 -- OrgContext shape, service methods, OrgUnit shape, no church terms, generic role |

Total: **27 tests**

### Key Test Scenarios

- **Org isolation**: Units from other organizations are invisible when `getContext()` returns a different org
- **Nested units**: `parentId` supports hierarchical org structures
- **Domain-agnostic**: No church-specific terminology in the capability layer

## Architecture Notes

- `orgId` source of truth is `getOrganizationId()` from `src/lib/orgContext.ts`
- `orgName` defaults to `orgId` when not explicitly registered
- `role` in `OrgContext` defaults to `'member'` -- this is a placeholder for the user's role in that org
- In-memory store -- org units are not persisted to the database by this capability
