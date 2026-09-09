# Identity Capability

**Module:** `src/capabilities/identity/index.ts`
**Tests:** [`identity.test.ts`](../../src/capabilities/__tests__/identity.test.ts)

## Purpose and Responsibility

The Identity capability manages **user profile records** in an in-memory store. It is domain-agnostic -- any system with users can use this capability to store and retrieve profile data. It does not handle authentication, session management, or persistence to a database.

## Public API

### Types

```typescript
interface IdentityProfile {
  /** Unique identifier for the identity */
  id: string;
  /** User's email address */
  email: string;
  /** Display name for the user */
  displayName: string;
  /** Arbitrary key-value metadata for extensibility */
  metadata: Record<string, unknown>;
}

type IdentityProfileUpdate = Partial<Pick<IdentityProfile, 'email' | 'displayName' | 'metadata'>>;
```

### IdentityService

```typescript
class IdentityService {
  /** Get a profile by user id. Returns null if not found. */
  getProfile(userId: string): IdentityProfile | null

  /** Create a new profile if one does not exist. Idempotent by id. */
  createProfile(userId: string, email: string, displayName: string, metadata?: Record<string, unknown>): IdentityProfile

  /** Update fields on an existing profile. Returns null if not found. */
  updateProfile(userId: string, updates: IdentityProfileUpdate): IdentityProfile | null

  /** Delete a profile by user id. Returns true if it existed. */
  deleteProfile(userId: string): boolean

  /** List all profiles. */
  listProfiles(): IdentityProfile[]

  /** Check if a profile exists. */
  hasProfile(userId: string): boolean
}
```

## Usage Examples

```typescript
import { identity } from '@/capabilities/identity';

// Create or get existing
const profile = identity.createProfile('user-1', 'alice@example.com', 'Alice');

// Update
const updated = identity.updateProfile('user-1', { displayName: 'Alice Smith' });

// Check existence
const exists = identity.hasProfile('user-1'); // true

// List all
const all = identity.listProfiles();

// Delete
identity.deleteProfile('user-1');
```

## Test Coverage

| Test Suite | Tests |
|---|---|
| `getProfile` | 3 -- null for missing, existing profile, with metadata |
| `createProfile` | 3 -- creates new, idempotent, accepts metadata |
| `updateProfile` | 6 -- displayName, email, metadata, not-found, preserves fields, replaces metadata |
| `deleteProfile` | 3 -- removes, not-found, re-creation |
| `listProfiles` | 2 -- empty, all profiles |
| `hasProfile` | 2 -- true, false |
| Contract + type safety | 5 -- profile fields, service methods, partial updates, empty update |

Total: **22 tests**

### Key Test Scenarios

- **Idempotent creation**: Calling `createProfile` twice with the same id returns the original profile
- **Metadata replace**: `updateProfile` with new metadata replaces entirely (does not merge)
- **Delete and re-create**: After deletion, the same id can be used again

## Architecture Notes

- Store is **in-memory** (`Map<string, IdentityProfile>`). Not persisted across restarts.
- No auth integration -- this is purely a profile store.
- `metadata` is an open `Record<string, unknown>` for flexible extension.
- The singleton pattern ensures a single store per runtime.
