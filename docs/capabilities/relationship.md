# Relationship Capability

**Module:** `src/capabilities/relationship/index.ts`
**Tests:** [`relationship.test.ts`](../../src/capabilities/__tests__/relationship.test.ts)

## Purpose and Responsibility

The Relationship capability manages **many-to-many memberships** between members and groups. It is the single source of truth for:

- Adding a member to a group (with a role)
- Removing a member from a group
- Checking whether a member belongs to a group

Currently limited to `group_memberships` (group-member relationships). The design is intended to be generalized to any entity-to-entity relationship in the future.

## Public API

### Types

```typescript
type MembershipRole = 'MEMBRE' | 'RESPONSABLE';

interface Membership {
  id: string;
  groupId: string;
  memberId: string;
  role: MembershipRole;
  joinedAt: string;
  leftAt: string | null;
}
```

### RelationshipService

```typescript
class RelationshipService {
  /**
   * Add a member to a group.
   * Returns the membership id.
   */
  addMembership(
    groupId: string,
    memberId: string,
    role: MembershipRole,
    _actorId: string
  ): Promise<string>

  /**
   * Remove a membership by id.
   * No-op if the id does not exist.
   */
  removeMembership(membershipId: string, _actorId: string): Promise<void>

  /**
   * Check if a member belongs to a group (with org isolation).
   */
  isMember(groupId: string, memberId: string): Promise<boolean>
}
```

## Usage Examples

```typescript
import { relationship } from '@/capabilities/relationship';

// Add a member to a group
const membershipId = await relationship.addMembership(
  'group-1',
  'member-1',
  'MEMBRE',
  'admin-user'
);

// Add as leader
await relationship.addMembership('group-1', 'member-2', 'RESPONSABLE', 'admin-user');

// Check membership
const isMember = await relationship.isMember('group-1', 'member-1'); // true

// Remove membership
await relationship.removeMembership(membershipId, 'admin-user');

// Verify removal
const stillMember = await relationship.isMember('group-1', 'member-1'); // false
```

## Organization Isolation

All membership queries are scoped to the current organization via `getOrganizationId()`. This means:

- A membership for `group-1/member-1` in `org-a` is invisible when the context is `org-b`
- `isMember()` checks `org_id` as part of the lookup

This is verified in tests (see `isMember filters by org_id`).

## Data Layer

The capability delegates all persistence to `src/lib/dataLayer.ts`:

- `addGroupMembershipPS(groupId, memberId, role)` — inserts and returns the new membership id
- `removeGroupMembershipPS(membershipId)` — deletes the membership row
- `getGroupMembershipsPS()` — returns all memberships (the caller filters by org)

## Test Coverage

| Test Suite | Tests |
|---|---|
| `addMembership` | 5 — returns id, persists, RESPONSABLE role, unique ids, cross-group |
| `removeMembership` | 3 — removes, no-op on missing, does not affect others |
| `isMember` | 8 — true, false, empty list, different group, any role, multi-membership, org isolation |

Total: **16 tests**

### Key Test Scenarios

- **Cross-org isolation**: Two memberships for the same group/member pair in different orgs are correctly isolated
- **Role agnostic**: `isMember` returns true regardless of whether the role is `MEMBRE` or `RESPONSABLE`
- **Idempotent remove**: Removing a non-existent membership does not throw
- **Unique ids**: Each `addMembership` call produces a distinct id

## Architecture Notes

- `_actorId` parameter is accepted but not currently used in the implementation — reserved for future audit trail integration
- The `isMember` method fetches all memberships and filters in-memory (no dedicated SQL query). This is acceptable for the current scale but should be optimized if the membership count grows significantly
- Future generalization: replace `group_memberships` with a generic `relationships` table supporting any entity pair
