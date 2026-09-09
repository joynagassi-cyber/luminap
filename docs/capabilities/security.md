# Security Capability

**Module:** `src/capabilities/security/index.ts`
**Tests:** [`security.test.ts`](../../src/capabilities/__tests__/security.test.ts)
**Source of truth:** `src/lib/rbac.ts`

## Purpose and Responsibility

The Security capability is a **facade over the RBAC system** defined in `src/lib/rbac.ts`. It provides a capability-style API for checking permissions and roles without importing the internal library directly.

**Critical rule**: Do NOT redefine `PERMISSION_MATRIX`, `ROLE_LABELS`, or `ROLE_HIERARCHY` in this file. They are re-exported from `rbac.ts` as the single source of truth. All logic delegates to `rbac.ts` functions.

## Public API

### Re-exported Constants

```typescript
// From src/lib/rbac.ts — same objects, re-exported for convenience
export { PERMISSION_MATRIX, ROLE_LABELS, ROLE_HIERARCHY };
export type { Permission };
```

Where:
- `PERMISSION_MATRIX`: `Readonly<Record<Role, Permission[]>>` — maps each role to its list of permissions
- `ROLE_LABELS`: `Record<Role, string>` — French display labels for each role
- `ROLE_HIERARCHY`: `Record<Role, number>` — numeric rank for hierarchy comparison
- `Permission`: `string` — formatted as `resource:action` (e.g., `'transaction:approve'`)

### SecurityService

```typescript
class SecurityService {
  /** Check if a role has a specific permission */
  hasPermission(role: Role, permission: Permission): boolean

  /** Alias for hasPermission (same implementation) */
  checkPermission(role: Role, permission: Permission): boolean

  /** Check role-based resource access (resource:action format internally) */
  hasRole(role: Role, resource: string, action: string): boolean

  /** Check if user's role is >= required role in hierarchy */
  hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean

  /** Get all permissions for a role */
  getRolePermissions(role: Role): Permission[]

  /** Get all roles that have a given permission */
  getRolesWithPermission(permission: Permission): Role[]

  /** Get the French label for a role */
  getRoleLabel(role: Role): string

  /** Get a copy of all role labels */
  getRoleLabels(): Record<Role, string>

  /** Get roles sorted by hierarchy (highest first) */
  getSortedRoles(): Role[]

  /** Parse a raw string into a Role, or null if invalid */
  parseRole(raw: string): Role | null
}
```

## Role Hierarchy

Roles are ranked from highest (100) to lowest (10):

| Role | Rank | Label |
|---|---|---|
| `PASTEUR_PRINCIPAL` | 100 | Pasteur Principal |
| `ANCIEN` | 90 | Ancien |
| `PASTEUR_ASSOCIE` | 85 | Pasteur Associe |
| `PASTEUR_JEUNESSE` | 80 | Pasteur Jeunesse |
| `DIACRE` | 70 | Diacre |
| `RESPONSABLE_DEPARTEMENT` | 65 | Responsable Departement |
| `TREASURIER` | 55 | Tresorier |
| `TREASURIER_ADJOINT` | 50 | Tresorier Adjoint |
| `SECRETAIRE` | 45 | Secretaire |
| `SECRETAIRE_ADJOINT` | 40 | Secretaire Adjoint |
| `COMPTABLE` | 35 | Comptable |
| `RESPONSABLE_GROUPE` | 30 | Responsable Groupe |
| `BENEVOLE` | 20 | Benevole |
| `MEMBRE` | 10 | Membre |

## Permissions

Common permissions (partial list — see `rbac.ts` for full matrix):

| Permission | Description |
|---|---|
| `transaction:read` | View transactions |
| `transaction:approve` | Approve transactions |
| `transaction:delete` | Delete transactions |
| `event:create` | Create events |
| `event:read` | View events |
| `member:create` | Create members |
| `group:delete` | Delete groups |
| `admin:settings` | Access admin settings |

## Usage Examples

```typescript
import { security, PERMISSION_MATRIX, ROLE_LABELS } from '@/capabilities/security';
import type { Role, Permission } from '@/types';

// Check if a treasurer can approve transactions
const canApprove = security.hasPermission('TREASURIER', 'transaction:approve'); // true

// Check using resource:action shorthand
const canCreateEvent = security.hasRole('BENEVOLE', 'event', 'create'); // false
const canCreateEvent2 = security.hasRole('SECRETAIRE', 'event', 'create'); // true

// Hierarchy check
const isSenior = security.hasHigherOrEqualRole('PASTEUR_ASSOCIE', 'TREASURIER'); // true
const isJunior = security.hasHigherOrEqualRole('MEMBRE', 'TREASURIER'); // false

// Get role labels
console.log(security.getRoleLabel('PASTEUR_PRINCIPAL')); // 'Pasteur Principal'

// Get sorted roles (highest first)
const sorted = security.getSortedRoles(); // ['PASTEUR_PRINCIPAL', 'ANCIEN', ...]

// Parse a raw string
const role = security.parseRole('TREASURIER'); // 'TREASURIER'
const invalid = security.parseRole('UNKNOWN'); // null

// Get all roles that can approve transactions
const approvers = security.getRolesWithPermission('transaction:approve');
// ['PASTEUR_PRINCIPAL', 'TREASURIER']

// Access the permission matrix directly
const pastorPerms = PERMISSION_MATRIX.PASTEUR_PRINCIPAL;
```

## Test Coverage

| Test Suite | Tests |
|---|---|
| `hasPermission` | 7 — positive, negative, unknown perm, matrix consistency |
| `checkPermission` | 6 — true/false cases, unknown role, getRolesWithPermission |
| `hasRole` | 5 — resource:action mapping, event/member perms |
| `hasHigherOrEqualRole` | 5 — equal, higher, lower, ANCIEN vs PASTEUR_ASSOCIE, full chain |
| `getRolePermissions` | 3 — pastor full list, unknown role empty, membre count |
| `getRolesWithPermission` | 3 — transaction:approve, admin:settings, nonexistent |
| `getRoleLabel` | 3 — pastor, membre, unknown |
| `getRoleLabels` | 2 — full copy, immutability (shallow copy) |
| `getSortedRoles` | 3 — order, count, determinism |
| `parseRole` | 4 — valid, invalid, empty, all valid roles |
| `re-exported constants` | 3 — labels cover all roles, hierarchy has numbers, matrix non-empty |

Total: **43 tests**

### Key Test Scenarios

- **Matrix consistency**: Every permission listed in `PERMISSION_MATRIX` for a role returns `true` from `hasPermission`
- **Full hierarchy chain**: All 14 roles are compared pairwise (182 assertions) to verify transitivity
- **Shallow copy**: Modifying the returned labels object does not affect internal state
- **Unknown role handling**: `hasPermission('UNKNOWN_ROLE', ...)` returns `false`, not an error

## Architecture Notes

- This is a **facade only** — all logic lives in `src/lib/rbac.ts`
- Do not add new permissions here; add them to `rbac.ts` and the matrix
- `checkPermission` and `hasPermission` are aliases with identical behavior
- The `hasRole(resource, action)` method is a convenience that constructs the `resource:action` permission string internally
