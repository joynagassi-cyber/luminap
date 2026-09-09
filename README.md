# Lumina

> A financial management application for French associations — built with React, Ionic, Capacitor, and PowerSync.

## Project Status

| Metric | Value | Status |
|--------|-------|--------|
| **Current Phase** | Platform Complete | ✅ |
| **Build** | 2 chunks, 15.1s total | ✅ PASS |
| **TypeScript** | 0 errors | ✅ PASS |
| **Tests** | 327 passed (11 test files) | ✅ PASS |
| **Capabilities** | 10 (9 active + 1 WIP) | ✅ |
| **Pages** | 38 Ionic routes | ✅ |
| **PowerSync Streams** | 20 | ✅ |
| **RLS Policies** | All tables | ✅ |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React 19 + TypeScript | ^19.2.8 |
| **Mobile Shell** | Capacitor 6 (Android) | ^6.2.2 |
| **UI Component Library** | Ionic React 9 | ^9.0.2 |
| **Build Tool** | Vite | ^8.2.2 |
| **State Management** | Zustand | ^5.0.15 |
| **Data Layer** | PowerSync (SQLite + Supabase) | ^2.x |
| **Backend** | Supabase (PostgreSQL) | ^2.x |
| **Auth** | Supabase Auth + Google OAuth + OneSignal | |
| **Routing** | React Router DOM → Ionic React Router | ^6.30.6 |
| **Styling** | Tailwind CSS + Ionic CSS Variables | ^3.4.19 |
| **Forms** | React Hook Form + Zod | ^7.87.0 |
| **Data Fetching** | TanStack React Query | ^5.102.8 |
| **Notifications** | OneSignal (Capacitor) | ^5.5.4 |
| **Utilities** | date-fns, lucide-react, recharts | |

## Architecture

Lumina uses an **incremental Ionic React migration** approach — Ionic components wrap the existing React pages without replacing them. The app runs on both web and Android via Capacitor.

```
src/
├── App.tsx               # Main entry — wraps IonicApp + providers
├── IonicApp.tsx          # Ionic wrapper (IonApp + IonReactRouter + IonSplitPane)
├── main.tsx              # React entry point (imports App + Ionic theme)
├── AppRouter.tsx         # Auth route guard (unchanged)
├── ionic/
│   ├── theme.ts          # Lumina design tokens → Ionic CSS variables
│   ├── theme.css         # Ionic CSS overrides
│   └── routing.tsx       # 38 route definitions
├── pages/                # All 36+ existing pages (unchanged)
├── components/           # Shared React components
├── capabilities/         # Business logic capabilities (10)
├── store/                # Zustand stores
├── lib/                  # Utilities, auth, data layer
└── context/              # React contexts
```

## Capabilities

Each capability is a domain-agnostic, testable facade over shared libraries. Cross-capability imports are enforced via automated tests.

| Capability | Module | Purpose | Tests | Docs |
|---|---|---|---|---|
| [Identity](docs/capabilities/identity.md) | `src/capabilities/identity/` | User profile management (in-memory) | 34 | [link](docs/capabilities/identity.md) |
| [Organization](docs/capabilities/organization.md) | `src/capabilities/organization/` | Organizational context and unit management | 53 | [link](docs/capabilities/organization.md) |
| [Security](docs/capabilities/security.md) | `src/capabilities/security/` | RBAC evaluation facade (delegates to `src/lib/rbac.ts`) | 57 | [link](docs/capabilities/security.md) |
| [Workflow](docs/capabilities/workflow.md) | `src/capabilities/workflow/` | Status transition guards with immutability | 42 | [link](docs/capabilities/workflow.md) |
| [Lifecycle](docs/capabilities/lifecycle.md) | `src/capabilities/lifecycle/` | Archive/restore with audit trail | 33 | [link](docs/capabilities/lifecycle.md) |
| [Relationship](docs/capabilities/relationship.md) | `src/capabilities/relationship/` | Group membership management | 20 | [link](docs/capabilities/relationship.md) |
| [Resource](docs/capabilities/resource.md) | `src/capabilities/resource/` | Generic entity CRUD via PowerSync | 29 | [link](docs/capabilities/resource.md) |
| [Policy](docs/capabilities/policy.md) | `src/capabilities/policy/` | Business rule enforcement (cotisation, transaction, versement) | 58 | [link](docs/capabilities/policy.md) |
| [Notification](docs/capabilities/notification.md) | `src/capabilities/notification/` | OneSignal push notification facade | 27 | [link](docs/capabilities/notification.md) |
| [Federation](docs/capabilities/federation.md) | `src/capabilities/federation/` | Multi-organization management | 0 (planned) | [link](docs/capabilities/federation.md) |

**Total: 327 tests across 11 test files (10 capability suites + e2e + no-cross-imports)**

## Installation

```bash
# Install dependencies
pnpm install

# Install Capacitor CLI
pnpm add -D @capacitor/cli

# Sync Capacitor config
npx cap init
```

## Development

```bash
# Start Vite dev server (web)
pnpm dev

# Type-check
pnpm lint

# Run all tests
pnpm test
```

## Build

```bash
# Production web build
pnpm build

# Dev web build
pnpm build:dev

# Capacitor build (sets CAPACITOR_BUILD=true)
pnpm build:cap
```

## Ionic-Specific Build Commands

```bash
# Add Android platform (first time only)
npx cap add android

# Sync web build to Android
pnpm build:cap && npx cap sync android

# Open Android Studio
npx cap open android

# Live reload to Android device
npx cap run android

# Platform-specific dev with Ionic
pnpm dev --host 0.0.0.0  # expose for device debugging
```

## Ionic Configuration

Ionic React is initialized directly in `src/App.tsx` via `setupIonicReact()`. The app uses **iOS mode** with dark theme by default:

```typescript
// src/App.tsx
setupIonicReact({
  mode: 'ios',
  animated: true,
  keyboardBehavior: 'ion-focus',
  keyboardFillMode: 'overlap',
});
```

The `IonicApp.tsx` file provides the Ionic shell with `IonSplitPane` for responsive desktop/mobile layout:

```tsx
// IonicApp.tsx — wraps all routes in IonApp + IonReactRouter + IonSplitPane
<IonApp>
  <IonReactRouter>
    <IonSplitPane contentId="main-content" when="lg">
      {/* Desktop sidebar layout */}
      <IonRouterOutlet id="main-content">...</IonRouterOutlet>
    </IonSplitPane>
    {/* Mobile single-pane fallback */}
    <IonRouterOutlet id="main-content-mobile">...</IonRouterOutlet>
  </IonReactRouter>
</IonApp>
```

## Theme

Lumina design tokens are mapped to Ionic CSS variables in `src/ionic/theme.ts`. The default palette is dark mode with orange accents (`#FF6B00`).

See `docs/ionic-migration.md` for full migration details.

## Capability Architecture Rules

1. **No cross-capability imports** — each capability is independent. Enforced by `src/capabilities/__tests__/no-cross-imports.test.ts`.
2. **No UI coupling** — capabilities must not import from `@/pages` or `@/components`.
3. **Singleton pattern** — every capability exports a singleton instance for convenience.
4. **Domain-agnostic** — capabilities avoid church-specific terminology where possible; domain-specific logic lives in `src/lib/` or in caller code.

## Test Coverage

Run all tests:

```bash
pnpm test
```

Run only capability tests:

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
