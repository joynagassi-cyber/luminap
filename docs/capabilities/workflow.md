# Workflow Capability

**Module:** `src/capabilities/workflow/index.ts`
**Tests:** [`workflow.test.ts`](../../src/capabilities/__tests__/workflow.test.ts)

## Purpose and Responsibility

The Workflow capability provides a **status transition guard system**. It enforces valid state machines for entities whose status can change over time (events, transactions, members). It does NOT perform the transition itself — it validates that a transition is allowed, then returns a result that the caller uses to decide whether to proceed.

This is distinct from the Lifecycle capability, which handles archive/restore with audit logging. Workflow handles *active-state transitions* with immutability guards.

## Public API

### Types

```typescript
interface GuardResult {
  allowed: boolean;
  reason?: string;
}

type WorkflowGuard = (
  currentStatus: string,
  targetStatus: string,
  context?: Record<string, any>
) => GuardResult;
```

### WorkflowService

```typescript
class WorkflowService {
  /** Register a guard function for a resource type */
  register(resource: string, guard: WorkflowGuard): void

  /** Check if a transition is allowed (dry-run) */
  check(resource: string, currentStatus: string, targetStatus: string): GuardResult

  /** Perform a guarded transition — returns { success, reason? } */
  transition<T extends { id: string; status: string }>(
    resource: string,
    entity: T,
    targetStatus: string,
    context?: Record<string, any>
  ): Promise<{ success: boolean; reason?: string }>
}
```

### Pre-registered Guards

Three guards are registered automatically at module load:

| Guard | Resource | Status Machine |
|---|---|---|
| `eventStatusGuard` | `'event'` | `PLANIFIED -> ONGOING -> COMPLETED` (CANCELLED is terminal) |
| `transactionGuard` | `'transaction'` | Any -> APPROVED (terminal, immutable) |
| `memberStatusGuard` | `'member'` | `ACTIVE <-> INACTIVE` |

#### eventStatusGuard

```
PLANIFIED --[start]--> ONGOING --[complete]--> COMPLETED (terminal)
      \                                         /
       --[cancel]--> CANCELLED (terminal) <---/
```

Rules:
- `COMPLETED` is terminal — no outgoing transitions allowed (except self-transition)
- `CANCELLED` is terminal — no outgoing transitions allowed (except self-transition)
- `PLANIFIED` can only go to `ONGOING` or `CANCELLED`
- `ONGOING` can only go to `COMPLETED` or `CANCELLED`

#### transactionGuard

```
Any status --[approve]--> APPROVED (terminal)
```

Rules:
- `APPROVED` is terminal — no outgoing transitions allowed (except self-transition)
- All other transitions are allowed

#### memberStatusGuard

```
ACTIVE <-> INACTIVE
```

Rules:
- Only `ACTIVE` and `INACTIVE` are valid statuses
- Transitions between them are always allowed
- Self-transitions are allowed (no-op)

## Usage Examples

```typescript
import { workflow, transactionGuard, eventStatusGuard } from '@/capabilities/workflow';

// Check if a transition is allowed (without performing it)
const result = workflow.check('event', 'PLANIFIED', 'ONGOING');
if (!result.allowed) {
  console.error('Cannot start event:', result.reason); // 'INVALID_EVENT_TRANSITION'
}

// Check that APPROVED transactions cannot be modified
const blocked = workflow.check('transaction', 'APPROVED', 'DRAFT');
console.log(blocked.reason); // 'TRANSACTION_APPROVED_IMMUTABLE'

// Perform a guarded transition
const tx = { id: 'tx-1', status: 'DRAFT' };
const transitionResult = await workflow.transition('transaction', tx, 'APPROVED');
if (!transitionResult.success) {
  console.error('Transaction approval failed:', transitionResult.reason);
}

// Register a custom guard
const customGuard: WorkflowGuard = (current, target) => {
  if (current === 'REVIEWING' && target === 'PUBLISHED') {
    return { allowed: false, reason: 'REQUIRES_APPROVAL' };
  }
  return { allowed: true };
};
workflow.register('document', customGuard);
```

## Test Coverage

| Test Suite | Coverage |
|---|---|
| `transactionGuard` | 9 tests — all transitions, immutability, no-op |
| `WorkflowService.check` | 3 tests — no guard default, custom guard, registered guard |
| `eventStatusGuard` | 10 tests — all valid/invalid transitions, terminal states |
| `memberStatusGuard` | 7 tests — ACTIVE/INACTIVE, invalid statuses |
| `WorkflowService.transition` | 6 tests — success, blocked, no-op, no guard, invalid member |

Total: **35 tests**

### Key Test Scenarios

- **Immutability**: APPROVED transaction cannot transition to any other status
- **Terminal states**: COMPLETED and CANCELLED events cannot be modified
- **Valid paths**: PLANIFIED -> ONGOING -> COMPLETED is allowed; PLANIFIED -> COMPLETED is blocked (must go through ONGOING)
- **No guard default**: unregistered resource types always return `{ allowed: true }`
- **Same-status no-op**: transitioning to the same status is always allowed

## Integration Points

- Used by `src/lib/rbac.ts` for role-based immutability checks
- Consumed by page components via `workflow.transition()` before committing state changes
- The `src/capabilities/lifecycle/` capability is a separate concern (archive/restore, not status transitions)

## Architecture Notes

- Guards are pure functions — no side effects
- `transition()` only validates; the caller is responsible for performing the actual state change
- Guards are registered at module load time for built-in types
- Adding a new guard: `workflow.register('myEntity', myGuard)`
