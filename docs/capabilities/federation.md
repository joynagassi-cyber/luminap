# Federation Capability

**Module:** `src/capabilities/federation/index.ts`
**Tests:** None yet

## Purpose and Responsibility

The Federation capability manages **multi-organization structures and relationships**. It enables federated hierarchies (e.g., a church network, school district, or company group) where multiple organizations can be registered, organized under parents, and associated with configuration templates.

This is the foundational layer for cross-organization features planned in future sprints.

## Public API

### Types

```typescript
interface Organization {
  id: string;
  name: string;
  type: 'church' | 'school' | 'company' | 'ngo' | 'custom';
  parentId?: string;      // parent organization in the federation tree
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface OrgUnit {
  id: string;
  name: string;
  orgId: string;
  parentId?: string;      // hierarchical unit within the org
  type: string;
}
```

### FederationService

```typescript
class FederationService {
  /** Create a new organization in the federation */
  async createOrg(config: Partial<Organization>): Promise<Organization>

  /** Get an organization by ID */
  async getOrg(id: string): Promise<Organization | null>

  /** List organizations with optional filters */
  async listOrgs(filter?: { type?: string; parentId?: string }): Promise<Organization[]>

  /** Register a template for an organization */
  async registerTemplate(orgId: string, templateId: string): Promise<void>

  /** Get templates registered for an organization */
  async getTemplates(orgId: string): Promise<string[]>

  /** Add an org unit to an organization */
  addOrgUnit(unit: OrgUnit): void

  /** Get org units for an organization */
  getOrgUnits(orgId: string): OrgUnit[]
}
```

## Usage Examples

```typescript
import { federation } from '@/capabilities/federation';

// Create a root organization
const root = await federation.createOrg({
  name: 'International Church Network',
  type: 'church',
});

// Create a child organization
const child = await federation.createOrg({
  name: 'Alpha Branch',
  type: 'church',
  parentId: root.id,
});

// List all churches
const churches = await federation.listOrgs({ type: 'church' });

// List direct children of the root
const branches = await federation.listOrgs({ parentId: root.id });

// Register templates
await federation.registerTemplate(root.id, 'standard-worship');
await federation.registerTemplate(root.id, 'youth-ministry');

const templates = await federation.getTemplates(root.id);

// Manage org units
federation.addOrgUnit({
  id: 'u1',
  name: 'Worship Team',
  orgId: child.id,
  type: 'department',
});

const units = federation.getOrgUnits(child.id);
```

## Architecture Notes

- **In-memory store**: Organizations and units are held in `Map` structures. No database persistence yet.
- **Template registration**: Templates are string identifiers (e.g., `'standard-worship'`) that can be resolved by a template compiler service.
- **Tree structure**: Organizations form a tree via `parentId`. `listOrgs({ parentId: 'x' })` returns direct children.
- **Org units**: Separate from the organization tree -- these are sub-units *within* a single organization (departments, teams, etc.).
- **Not yet integrated**: This capability does not currently interact with the Organization capability or the RBAC system.

## Test Coverage

| Status | Tests |
|---|---|
| Not yet implemented | 0 |

### Planned Test Scenarios

- `createOrg` -- creates with defaults, creates with full config
- `getOrg` -- found, not found
- `listOrgs` -- all, filtered by type, filtered by parentId
- `registerTemplate` / `getTemplates` -- add, retrieve, deduplicate
- `addOrgUnit` / `getOrgUnits` -- add, retrieve, multiple units per org

## Integration Points

- `src/capabilities/organization/` -- federation layer sits above the single-org organization capability
- `src/capabilities/federation/` will eventually feed into `src/lib/rbac.ts` for cross-org role resolution
- The `ManifestCompilerService` (Community 13 in the graph) is a future consumer of template data
