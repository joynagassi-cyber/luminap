# Capabilities API Documentation

Comprehensive documentation for all capabilities in the Lumina application.

## Capability Map

| Capability | Module | Purpose | Tests | Docs |
|---|---|---|---|---|
| [Identity](identity.md) | `src/capabilities/identity/` | User profile management (in-memory) | [identity.test.ts](../../src/capabilities/__tests__/identity.test.ts) | 22 tests |
| [Organization](organization.md) | `src/capabilities/organization/` | Organizational context and unit management | [organization.test.ts](../../src/capabilities/__tests__/organization.test.ts) | 27 tests |
| [Security](security.md) | `src/capabilities/security/` | RBAC evaluation facade (delegates to `src/lib/rbac.ts`) | [security.test.ts](../../src/capabilities/__tests__/security.test.ts) | 43 tests |
| [Workflow](workflow.md) | `src/capabilities/workflow/` | Status transition guards with immutability | [workflow.test.ts](../../src/capabilities/__tests__/workflow.test.ts) | 35 tests |
| [Lifecycle](lifecycle.md) | `src/capabilities/lifecycle/` | Archive/restore with audit trail | [lifecycle.test.ts](../../src/capabilities/__tests__/lifecycle.test.ts) | 26 tests |
| [Relationship](relationship.md) | `src/capabilities/relationship/` | Group membership management | [relationship.test.ts](../../src/capabilities/__tests__/relationship.test.ts) | 16 tests |
| [Resource](resource.md) | `src/capabilities/resource/` | Generic entity CRUD via PowerSync | [resource.test.ts](../../src/capabilities/__tests__/resource.test.ts) | 22 tests |
| [Policy](policy.md) | `src/capabilities/policy/` | Business rule enforcement (cotisation, transaction, versement) | [policy.test.ts](../../src/capabilities/__tests__/policy.test.ts) | 36 tests |
| [Notification](notification.md) | `src/capabilities/notification/` | OneSignal push notification facade | [notification.test.ts](../../src/capabilities/__tests__/notification.test.ts) | 18 tests |
| [Federation](federation.md) | `src/capabilities/federation/` | Multi-organization management | -- | 0 tests (planned) |

**Total test coverage: 245 tests across 9 capability test suites**

## Architecture Rules

1. **No cross-capability imports** -- each capability is independent. Enforced by [`no-cross-imports.test.ts`](../../src/capabilities/__tests__/no-cross-imports.test.ts).
2. **No UI coupling** -- capabilities must not import from `@/pages` or `@/components`.
3. **Singleton pattern** -- every capability exports a singleton instance for convenience.
4. **Domain-agnostic** -- capabilities avoid church-specific terminology where possible; domain-specific logic lives in `src/lib/` or in caller code.

## How Capabilities Are Used

```typescript
// Each capability is imported from its subdirectory
import { identity } from '@/capabilities/identity';
import { organization } from '@/capabilities/organization';
import { security } from '@/capabilities/security';
import { workflow } from '@/capabilities/workflow';
import { lifecycle } from '@/capabilities/lifecycle';
import { relationship } from '@/capabilities/relationship';
import { resource } from '@/capabilities/resource';
import { policy } from '@/capabilities/policy';
import { notification } from '@/capabilities/notification';
import { federation } from '@/capabilities/federation';
```

## Test Coverage

Run all capability tests:

```bash
pnpm test src/capabilities/__tests__
```

Individual test files:

```bash
pnpm test src/capabilities/__tests__/identity.test.ts
pnpm test src/capabilities/__tests__/organization.test.ts
pnpm test src/capabilities/__tests__/security.test.ts
pnpm test src/capabilities/__tests__/workflow.test.ts
pnpm test src/capabilities/__tests__/lifecycle.test.ts
pnpm test src/capabilities/__tests__/relationship.test.ts
pnpm test src/capabilities/__tests__/resource.test.ts
pnpm test src/capabilities/__tests__/policy.test.ts
pnpm test src/capabilities/__tests__/notification.test.ts
```

E2E integration tests covering cross-capability flows:

```bash
pnpm test src/capabilities/__tests__/e2e.test.ts
pnpm test src/capabilities/__tests__/no-cross-imports.test.ts
```

## Directory Structure

```
docs/capabilities/
  README.md             # This file -- capability index and map
  identity.md           # User profile management
  organization.md       # Org context and units
  security.md           # RBAC facade
  workflow.md           # Status transition guards
  lifecycle.md          # Archive/restore with audit
  relationship.md       # Group memberships
  resource.md           # Generic PS query layer
  policy.md             # Business rule enforcement
  notification.md       # OneSignal facade
  federation.md         # Multi-org management

src/capabilities/
  __tests__/
    setup.ts                  # Shared mocks (PowerSync, orgContext, audit, dataLayer)
    e2e.test.ts               # Cross-capability integration tests
    no-cross-imports.test.ts  # Architecture boundary enforcement
    identity.test.ts
    organization.test.ts
    security.test.ts
    workflow.test.ts
    lifecycle.test.ts
    relationship.test.ts
    resource.test.ts
    policy.test.ts
    notification.test.ts
  identity/index.ts
  organization/index.ts
  security/index.ts
  workflow/index.ts
  lifecycle/index.ts
  lifecycle/adapters.ts       # Thin wrappers for pages (groupLifecycle, eventLifecycle, etc.)
  relationship/index.ts
  resource/index.ts
  policy/index.ts
  notification/index.ts
  federation/index.ts
```

## Capability Responsibility Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                 │
│                    (pages / components)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ imports
┌─────────────────────────▼───────────────────────────────────────┐
│                      Capabilities                                │
│                                                                  │
│  Identity       ──► User profiles (in-memory)                   │
│  Organization   ──► Org context + units                         │
│  Security       ──► RBAC checks (delegates to lib/rbac.ts)      │
│  Workflow       ──► Status transition guards                    │
│  Lifecycle      ──► Archive/restore + audit trail               │
│  Relationship   ──► Group memberships                           │
│  Resource       ──► Generic PS read layer                       │
│  Policy         ──► Business rule validation                    │
│  Notification   ──► OneSignal facade                            │
│  Federation     ──► Multi-org structures (WIP)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ depends on
┌─────────────────────────▼───────────────────────────────────────┐
│                      Shared Libraries                            │
│                                                                  │
│  src/lib/powersync.ts      ──► PowerSync database              │
│  src/lib/orgContext.ts     ──► Current org ID                  │
│  src/lib/rbac.ts           ──► RBAC source of truth             │
│  src/lib/audit.ts          ──► Audit log repository             │
│  src/lib/dataLayer.ts      ──► Data access layer                │
│  src/lib/onesignal.ts      ──► OneSignal service               │
│  src/lib/cotisation-logic.ts ──► 30-day lock logic             │
└─────────────────────────────────────────────────────────────────┘
```

## Capability Dependencies

```
Identity      (no capability dependencies)
Organization  --> Identity (reads role from context)
Security      --> (delegates to src/lib/rbac.ts)
Workflow      (no capability dependencies -- pure guards)
Lifecycle     --> Resource (reads entity state), Audit lib
Relationship  --> Resource (reads memberships), OrgContext
Resource      --> PowerSync lib, OrgContext
Policy        (no capability dependencies -- pure functions)
Notification  --> OneSignal lib
Federation    --> Organization (sits above it for multi-org)
```

## Cross-Capability Flow Examples

### Creating a Transaction
```
1. Policy.transaction.validateAmount(amount)   -- validate amount
2. Workflow.transition('transaction', tx, 'PENDING') -- guard transition
3. Security.hasPermission(role, 'transaction:create') -- check permission
4. Data layer persists via PowerSync
```

### Archiving a Group
```
1. Lifecycle.isLifecycleActive('Group', id)   -- check not already archived
2. Lifecycle.archive('Group', id, reason, actor) -- runs policy + audit
3. Relationship removes member memberships (caller responsibility)
```

### Sending a Notification
```
1. Notification.login(userId, role)           -- authenticate with OneSignal
2. Notification.sendNotification({ title, message, targetRole })
3. OneSignal tags are set for client-side tracing
```
