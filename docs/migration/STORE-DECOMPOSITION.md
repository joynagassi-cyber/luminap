# Store Decomposition — From Monolith to Capability-Driven Store

> Date: 2026-09-09
> Scope: `src/store/useLocalStore.ts` — 1087 lines → decomposed into capability delegates

---

## 1. Current State

`useLocalStore.ts` is a monolithic Zustand store containing:
- State declarations (600+ lines of state)
- Business logic (transaction, cotisation, versement, group, event, member logic)
- PowerSync persistence calls (interspersed throughout)
- Audit logging (inline in many methods)
- Archive/lifecycle checks (duplicated with `lifecycle` capability)

The store is the **orchestrator**, not the **owner** of business logic. Decomposition means moving logic out and keeping only state + dispatch.

---

## 2. Decomposition Strategy

### Phase 1: Identify Logic Buckets

| Bucket | Lines Est. | Target |
|--------|-----------|--------|
| Transaction CRUD + guards | ~200 | `transaction-service.ts` + `workflow` capability |
| Cotisation + culte logic | ~150 | `cotisation-service.ts` |
| Versement (pair transactions) | ~80 | `versement-service.ts` |
| Group lifecycle + accounts | ~100 | `group-service.ts` + `group-lifecycle.ts` |
| Event management | ~120 | `event-service.ts` |
| Member management | ~80 | `member-service.ts` |
| Archive/restore | ~60 | `lifecycle` capability (done) |
| Notification | ~40 | `notification-service.ts` |
| State declarations | ~250 | Stay in store |

### Phase 2: Store as Thin Orchestrator

**Before** (store contains logic):
```typescript
async addTransaction(data: AddTransactionData) {
  // 30 lines of validation, guard check, audit, persist, state update
  const tx = { ...data, id: generateId(), ... };
  await addTransactionPS(tx);
  set((s) => ({ transactions: [...s.transactions, tx] }));
  auditLogRepo.write({ action: 'CREATE', ... });
}
```

**After** (store delegates):
```typescript
async addTransaction(data: AddTransactionData) {
  // Guard check via workflow capability
  const guard = workflow.check('transaction', 'DRAFT', 'PENDING');
  if (!guard.allowed) { set({ error: guard.reason }); return; }

  // Build transaction via service
  const tx = buildAddTransaction(data);

  // Persist via data layer
  await persistAddTransaction(tx);

  // Update local state
  set((s) => ({ transactions: [...s.transactions, tx] }));

  // Audit
  await auditAddTransaction(tx);
}
```

The store becomes a **thin dispatcher**: validate → delegate → persist → update state → audit.

---

## 3. Before / After Examples

### Example 1: Transaction Update

**Before** (`useLocalStore.ts` ~line 230, 40 inline lines):
```typescript
updateTransaction: (id, updates) => {
  set((s) => {
    const tx = s.transactions.find((t) => t.id === id);
    if (!tx) return s;
    if (tx.status === 'APPROVED') {
      return { ...s, error: 'Transaction APPROVED is immutable' };
    }
    // ... 30 more lines of mutation logic
    const updated = { ...tx, ...updates };
    return { ...s, transactions: s.transactions.map((t) => (t.id === id ? updated : t)) };
  });
  updateTransactionPS(id, updates);
},
```

**After** (store delegates to `transaction-service.ts`):
```typescript
updateTransaction: async (id, updates) => {
  const tx = useLocalStore.getState().transactions.find((t) => t.id === id);
  if (!tx) return;

  const validation = validateUpdateTransaction(tx, updates);
  if (!validation.allowed) {
    useLocalStore.setState({ error: validation.reason });
    return;
  }

  const updated = applyUpdateTransaction(tx, updates);
  await persistUpdateTransaction(updated);
  auditUpdateTransaction(updated);

  useLocalStore.setState((s) => ({
    transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
  }));
},
```

### Example 2: Cotisation Payment

**Before** (`useLocalStore.ts` ~line 817, 50 inline lines with missing `isPaiementVerrouille`):
```typescript
markCotisationPaid: (id, orgId) => {
  set((s) => {
    const cotisation = s.cotisations.find((c) => c.id === id);
    if (!cotisation) return s;
    // BUG: isPaiementVerrouille was not defined here — crash
    const culte = s.cultes.find((c) => c.id === cotisation.culteId);
    // ... 40 more lines
  });
  markCotisationPaidPS(id);
},
```

**After** (logic in `cotisation-service.ts`, store calls it):
```typescript
// src/lib/cotisation-service.ts
export function markCotisationPaid(
  cotisations: Cotisation[],
  cultes: Culte[],
  id: string,
  actorId: string
): { cotisation: Cotisation; culte: Culte; excédent?: number } {
  const cotisation = cotisations.find((c) => c.id === id);
  if (!cotisation) throw new Error('Cotisation not found');
  const culte = cultes.find((c) => c.id === cotisation.culteId);
  if (!culte) throw new Error('Culte not found');

  if (isPaiementVerrouille({ dateCulte: culte.date, cotisationEstPaye: true })) {
    throw new Error('Payment locked — cult is older than 30 days');
  }

  const updated = { ...cotisation, statut: 'PAYE', payéPar: actorId, payéLe: new Date().toISOString() };
  const excédent = calculerDon(cotisation.montant, culte.montantDû);
  return { cotisation: updated, culte, excédent };
}

// Store — thin wrapper
markCotisationPaid: async (id) => {
  const { cotisation, excédent } = markCotisationPaid(
    useLocalStore.getState().cotisations,
    useLocalStore.getState().cultes,
    id,
    useLocalStore.getState().user.id
  );
  await persistMarkCotisationPaid(cotisation.id);
  set((s) => ({
    cotisations: s.cotisations.map((c) => (c.id === id ? cotisation : c)),
    ...(excédent ? { cultes: s.cultes.map((c) =>
      c.id === cotisation.culteId ? { ...c, excédent: (c.excédent ?? 0) + excédent } : c
    )) : {}),
  }));
},
```

### Example 3: Versement (Atomic Pair)

**Before** (store creates 2 transactions inline):
```typescript
createVersement: async (data) => {
  // 60 lines: validate, create tx1, create tx2, link them, update state
  const tx1 = { ...data, type: 'EXPENSE', ... };
  const tx2 = { ...data, type: 'INCOME', versementId: generateId(), ... };
  await addTransactionPS(tx1);
  await addTransactionPS(tx2);
  // update state...
},
```

**After** (logic in `versement-service.ts`):
```typescript
// src/lib/versement-service.ts
export function createVersement(data: CreateVersementData, orgId: string): { tx1: Transaction; tx2: Transaction } {
  const versementId = generateId();
  const now = new Date().toISOString();
  const tx1: Transaction = {
    ...data,
    id: generateId(),
    type: 'EXPENSE',
    versementId,
    orgId,
    status: 'DRAFT',
    createdAt: now,
  };
  const tx2: Transaction = {
    ...data,
    id: generateId(),
    type: 'INCOME',
    versementId,
    orgId,
    status: 'DRAFT',
    createdAt: now,
  };
  return { tx1, tx2 };
}

// Store — thin wrapper
createVersement: async (data) => {
  const { tx1, tx2 } = createVersement(data, getOrganizationId());
  await Promise.all([persistAddTransaction(tx1), persistAddTransaction(tx2)]);
  set((s) => ({
    transactions: [...s.transactions, tx1, tx2],
  }));
},
```

---

## 4. Files Already Decomposed

| File | Status | Lines |
|------|--------|-------|
| `src/lib/transaction-service.ts` | Done | ~200 |
| `src/lib/cotisation-service.ts` | Done | ~180 |
| `src/lib/versement-service.ts` | Done | ~80 |
| `src/lib/event-service.ts` | Done | ~120 |
| `src/lib/member-service.ts` | Done | ~80 |
| `src/lib/group-service.ts` | Done | ~60 |
| `src/lib/group-lifecycle.ts` | Done | ~100 |
| `src/lib/notification-service.ts` | Done | ~40 |

---

## 5. Remaining Store Work

The store still contains ~600 lines. Decomposition targets:

| Area | Current State | Next Step |
|------|--------------|-----------|
| State declarations | ~250 lines | Keep — this is Zustand state |
| Transaction methods | Partially extracted | Finalize all 8 methods |
| Cotisation methods | Partially extracted | Finalize `updateCotisation`, `getCotisationsForCulte` |
| Event methods | Partially extracted | Finalize budget line methods |
| Group methods | Partially extracted | Finalize `createGroup` (still creates 4 entities inline) |
| Member methods | Partially extracted | Finalize `archiveMember`, `restoreMember` |
| Versement methods | In store | Extract to `versement-service.ts` |
| Notification methods | Partially extracted | Finalize |
| `getCaisseForDisplay` | Inline merge | Use `CaisseAdapter.merge()` |

---

## 6. Verification Checklist

After each decomposition step:

- [ ] `pnpm tsc --noEmit` passes with 0 errors
- [ ] `pnpm build` succeeds
- [ ] The store method signature is unchanged (backward compatible)
- [ ] The capability/service being extracted has tests
- [ ] No logic was lost in translation (characterization tests pass)

---

*This is an ongoing decomposition. The store should never grow beyond ~400 lines of pure state + thin dispatch.*
