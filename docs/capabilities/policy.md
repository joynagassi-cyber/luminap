# Policy Capability

**Module:** `src/capabilities/policy/index.ts`
**Tests:** [`policy.test.ts`](../../src/capabilities/__tests__/policy.test.ts)

## Purpose and Responsibility

The Policy capability enforces **business rules** that govern data validity and immutability. It is distinct from the Workflow capability (which guards status transitions). Policy validates *data invariants* -- amounts, balances, lock windows, and atomicity constraints.

Rules covered:
- **Cotisation**: 30-day lock after service date, minimum amount enforcement
- **Transaction**: positive amount, APPROVED immutability
- **Versement**: balance sufficiency, atomic transfer constraint

## Public API

### Types

```typescript
interface PolicyResult {
  ok: boolean;
  rule?: string;   // machine-readable rule identifier
  message?: string; // human-readable explanation
}

interface CotisationPolicyParams {
  culteDate: string;       // ISO date string of the service
  statut: string;          // NON_PAYE, PAYE, ABSENT, EN_AVANCE
  montantPaye: number;     // amount already paid (cents)
  montantObligatoire: number; // required amount (cents)
}

interface TransactionPolicyParams {
  amountCents: number;
  status: string;
}

interface VersementPolicyParams {
  balanceCents: number;
  amountCents: number;
}
```

### Functions

#### Cotisation Policy

```typescript
/** Check whether a cotisation can still be modified.
 *  Locked when culte is >30 days old AND payment has been recorded. */
function cotisationCanModify(params: CotisationPolicyParams): PolicyResult

/** Validate cotisation payment amount.
 *  Minimum is 1 FCFA (100 cents). Maximum is ~10M FCFA. */
function cotisationValidateAmount(montantPayeCents: number): PolicyResult
```

#### Transaction Policy

```typescript
/** Validate transaction amount -- must be positive (in cents). */
function transactionValidateAmount(amountCents: number): PolicyResult

/** Check whether a transaction can be edited.
 *  APPROVED transactions are immutable. */
function transactionCanEdit(status: string): PolicyResult
```

#### Versement Policy

```typescript
/** Check whether a versement amount is within available balance. */
function versementCheckBalance(params: VersementPolicyParams): PolicyResult

/** Validate that a versement is atomic: source and target amounts match. */
function versementValidateAtomic(sourceAmountCents: number, targetAmountCents: number): PolicyResult
```

### PolicyService (Facade)

```typescript
class PolicyService {
  cotisation = { canModify, validateAmount };
  transaction = { validateAmount, canEdit };
  versement = { checkBalance, validateAtomic };
}
```

## Rule Catalog

| Rule ID | Domain | Condition |
|---|---|---|
| `COTISATION_CULTE_LOCKED` | Cotisation | Service date > 30 days ago, status NON_PAYE |
| `COTISATION_LOCKED` | Cotisation | Service date > 30 days ago, status PAYE |
| `COTISATION_MIN_AMOUNT` | Cotisation | Amount < 100 cents (1 FCFA) |
| `COTISATION_MAX_AMOUNT` | Cotisation | Amount > 999,999,999,00 cents |
| `TRANSACTION_POSITIVE_AMOUNT` | Transaction | Amount <= 0 |
| `TRANSACTION_MAX_AMOUNT` | Transaction | Amount > 999,999,999,00 cents |
| `TRANSACTION_APPROVED_IMMUTABLE` | Transaction | Status is APPROVED |
| `VERSEMENT_POSITIVE_AMOUNT` | Versement | Amount <= 0 |
| `VERSEMENT_INSUFFICIENT_BALANCE` | Versement | Amount > balance |
| `VERSEMENT_ATOMIC` | Versement | sourceAmount != targetAmount |

## Usage Examples

```typescript
import { policy } from '@/capabilities/policy';

// Cotisation: can this entry still be edited?
const cotisationResult = policy.cotisation.canModify({
  culteDate: '2024-01-15',
  statut: 'NON_PAYE',
  montantPaye: 0,
  montantObligatoire: 5000,
});
if (!cotisationResult.ok) console.error(cotisationResult.message);

// Transaction: validate amount before creating
const txResult = policy.transaction.validateAmount(500000); // 5000 FCFA
if (!txResult.ok) throw new Error(txResult.message);

// Transaction: can this be edited?
const canEdit = policy.transaction.canEdit('DRAFT'); // true
const blocked = policy.transaction.canEdit('APPROVED'); // false

// Versement: check balance
const balResult = policy.versement.checkBalance({ balanceCents: 1000000, amountCents: 500000 });
if (!balResult.ok) throw new Error(balResult.message);

// Versement: verify atomicity
const atomic = policy.versement.validateAtomic(500000, 500000); // true
```

## Test Coverage

| Test Suite | Tests |
|---|---|
| `cotisationCanModify` | 6 -- within 30d NON_PAYE, after 30d NON_PAYE, within 30d PAYE, after 30d PAYE, ABSENT, EN_AVANCE |
| `cotisationValidateAmount` | 6 -- min (100), zero, negative, below min, normal, above max |
| `transactionValidateAmount` | 5 -- positive, zero, negative, above max, minimum 1 cent |
| `transactionCanEdit` | 4 -- DRAFT, PENDING, APPROVED blocked, REJECTED |
| `versementCheckBalance` | 6 -- equals balance, below balance, exceeds balance, zero amount, negative amount, zero balance |
| `versementValidateAtomic` | 3 -- equal, source > target, source < target |
| `PolicyService singleton` | 6 -- sub-policy access, delegation for each domain |

Total: **36 tests**

### Key Test Scenarios

- **30-day lock window**: Tested with exact boundary (7 days = allowed, 35 days = blocked)
- **Immutability**: APPROVED transactions block all edits
- **Atomicity**: Versement requires source and target amounts to be identical
- **Facade delegation**: All singleton methods delegate correctly to the pure functions

## Architecture Notes

- All policy functions are **pure** -- no side effects, no database access
- The `rule` field in `PolicyResult` is machine-readable for programmatic handling
- The `message` field is human-readable for UI error display
- Policy is checked BEFORE the operation; the caller is responsible for acting on the result
