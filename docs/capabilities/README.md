# Capabilities API Documentation

Comprehensive documentation for all capabilities in the Lumina application.

## Capability Map

| Capability | Module | Purpose | Tests |
|---|---|---|---|
| [Identity](identity.md) | `src/capabilities/identity/` | User profile management (in-memory) | [identity.test.ts](../../src/capabilities/__tests__/identity.test.ts) |
| [Organization](organization.md) | `src/capabilities/organization/` | Organizational context and unit management | [organization.test.ts](../../src/capabilities/__tests__/organization.test.ts) |
| [Security](security.md) | `src/capabilities/security/` | RBAC evaluation facade (delegates to `src/lib/rbac.ts`) | [security.test.ts](../../src/capabilities/__tests__/security.test.ts) |
| [Workflow](workflow.md) | `src/capabilities/workflow/` | Status transition guards with immutability | [workflow.test.ts](../../src/capabilities/__tests__/workflow.test.ts) |
| [Lifecycle](lifecycle.md) | `src/capabilities/lifecycle/` | Archive/restore with audit trail | [lifecycle.test.ts](../../src/capabilities/__tests__/lifecycle.test.ts) |
| [Relationship](relationship.md) | `src/capabilities/relationship/` | Group membership management | [relationship.test.ts](../../src/capabilities/__tests__/relationship.test.ts) |
| [Resource](resource.md) | `src/capabilities/resource/` | Generic entity CRUD via PowerSync | [resource.test.ts](../../src/capabilities/__tests__/resource.test.ts) |
| [Policy](policy.md) | `src/capabilities/policy/` | Business rule enforcement (cotisation, transaction, versement) | [policy.test.ts](../../src/capabilities/__tests__/policy.test.ts) |
| [Notification](notification.md) | `src/capabilities/notification/` | OneSignal push notification facade | [notification.test.ts](../../src/capabilities/__tests__/notification.test.ts) |
| Federation | `src/capabilities/federation/` | **Not yet implemented** | — |

## Architecture Rules

1. **No cross-capability imports** — each capability is independent. Enforced by [`no-cross-imports.test.ts`](../../src/capabilities/__tests__/no-cross-imports.test.ts).
2. **No UI coupling** — capabilities must not import from `@/pages` or `@/components`.
3. **Singleton pattern** — every capability exports a singleton instance for convenience.
4. **Domain-agnostic** — capabilities avoid church-specific terminology where possible; domain-specific logic lives in `src/lib/` or in caller code.

## How Capabilities Are Used

```typescript
// Each capability is imported from its subdirectory
import { identity } from '@/capabilities/identity';
import { workflow } from '@/capabilities/workflow';
import { lifecycle } from '@/capabilities/lifecycle';
import { security } from '@/capabilities/security';
import { relationship } from '@/capabilities/relationship';
import { resource } from '@/capabilities/resource';
import { policy } from '@/capabilities/policy';
import { notification } from '@/capabilities/notification';
import { organization } from '@/capabilities/organization';
```

## Test Coverage

Run all capability tests:

```bash
pnpm test src/capabilities/__tests__
```

Individual test files:

```bash
pnpm test src/capabilities/__tests__/identity.test.ts
pnpm test src/capabilities/__tests__/workflow.test.ts
pnpm test src/capabilities/__tests__/lifecycle.test.ts
pnpm test src/capabilities/__tests__/security.test.ts
pnpm test src/capabilities/__tests__/relationship.test.ts
pnpm test src/capabilities/__tests__/resource.test.ts
pnpm test src/capabilities/__tests__/policy.test.ts
pnpm test src/capabilities/__tests__/notification.test.ts
pnpm test src/capabilities/__tests__/organization.test.ts
```

E2E integration tests covering cross-capability flows:

```bash
pnpm test src/capabilities/__tests__/e2e.test.ts
pnpm test src/capabilities/__tests__/no-cross-imports.test.ts
```

## Directory Structure

```
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
│  Identity  ──► User profiles (in-memory)                        │
│  Organization ──► Org context + units                           │
│  Security  ──► RBAC checks (delegates to lib/rbac.ts)           │
│  Workflow  ──► Status transition guards                         │
│  Lifecycle ──► Archive/restore + audit trail                    │
│  Relationship ──► Group memberships                              │
│  Resource  ──► Generic PS query layer                            │
│  Policy    ──► Business rule validation                          │
│  Notification ──► OneSignal facade                               │
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
└─────────────────────────────────────────────────────────────────┘
```
