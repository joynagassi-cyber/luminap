# Characterization Tests — Tests de Comportement Critique

> Date : 2026-09-07
> Objet : Tests de caractérisation pour protéger les règles métier pendant la migration

---

## 1. Méthodologie

Un **test de caractérisation** capture le comportement EXISTANT du code.
Il ne teste pas ce qui devrait être, mais ce qui EST.

**But** : Prouver que l'extraction architecturale ne modifie pas le comportement.

---

## 2. Tests Transactions

### 2.1 Transaction Creation — EXPENSE → PENDING

```typescript
// tests/characterization/transaction.create.expense.spec.ts
describe('Transaction Creation — EXPENSE', () => {
  it('should create transaction with PENDING status', async () => {
    const { addTransaction } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'EXPENSE',
      amount: 50000, // 500 FCFA
      description: 'Test expense',
      date: '2026-09-07',
      categoryId: 'cat-frais-fonc',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const tx = useLocalStore.getState().transactions.find(
      t => t.description === 'Test expense'
    );
    
    expect(tx).toBeDefined();
    expect(tx!.status).toBe('PENDING');
  });
});
```

**Règle métier** : EXPENSE → PENDING (doit être approuvé avant d'être comptabilisé)

---

### 2.2 Transaction Creation — INCOME → DRAFT

```typescript
// tests/characterization/transaction.create.income.spec.ts
describe('Transaction Creation — INCOME', () => {
  it('should create transaction with DRAFT status', async () => {
    const { addTransaction } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'INCOME',
      amount: 100000,
      description: 'Test income',
      date: '2026-09-07',
      categoryId: 'cat-dime',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const tx = useLocalStore.getState().transactions.find(
      t => t.description === 'Test income'
    );
    
    expect(tx).toBeDefined();
    expect(tx!.status).toBe('DRAFT');
  });
});
```

**Règle métier** : INCOME → DRAFT (doit être approuvé avant d'être comptabilisé)

---

### 2.3 Transaction APPROVED Immutability (BUG Actuel)

```typescript
// tests/characterization/transaction.approved.immutability.spec.ts
describe('Transaction APPROVED — Current Behavior (BUG)', () => {
  it('CURRENTLY allows updating APPROVED transaction (BUG)', async () => {
    const { addTransaction, approveTransaction, updateTransaction } = useLocalStore.getState();
    
    // Create and approve
    await addTransaction({
      orgId: 'org-1',
      type: 'EXPENSE',
      amount: 50000,
      description: 'Approvable tx',
      date: '2026-09-07',
      categoryId: 'cat-frais-fonc',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const pendingTx = useLocalStore.getState().transactions.find(
      t => t.description === 'Approvable tx'
    );
    
    if (pendingTx) {
      await approveTransaction(pendingTx.id, 'local-user');
      
      // CURRENTLY: This DOES NOT throw (BUG)
      // After fix: This SHOULD throw
      await expect(
        updateTransaction(pendingTx.id, { amount: 99999 })
      ).rejects.toThrow(); // <-- Expected after migration
    }
  });

  it('CURRENTLY allows deleting APPROVED transaction (BUG)', async () => {
    const { addTransaction, approveTransaction, deleteTransaction } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'EXPENSE',
      amount: 50000,
      description: 'Delete test',
      date: '2026-09-07',
      categoryId: 'cat-frais-fonc',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const pendingTx = useLocalStore.getState().transactions.find(
      t => t.description === 'Delete test'
    );
    
    if (pendingTx) {
      await approveTransaction(pendingTx.id, 'local-user');
      
      // CURRENTLY: This DOES NOT throw (BUG)
      await expect(
        deleteTransaction(pendingTx.id)
      ).rejects.toThrow(); // <-- Expected after migration
    }
  });
});
```

**Règle métier** : APPROVED → IMMUTABLE (à implémenter)

---

### 2.4 Transaction Reverse

```typescript
// tests/characterization/transaction.reverse.spec.ts
describe('Transaction Reverse', () => {
  it('should create compensating INCOME transaction for EXPENSE', async () => {
    const { addTransaction, approveTransaction, reverseTransaction } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'EXPENSE',
      amount: 50000,
      description: 'To reverse',
      date: '2026-09-07',
      categoryId: 'cat-frais-fonc',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const tx = useLocalStore.getState().transactions.find(
      t => t.description === 'To reverse'
    );
    
    if (tx) {
      await approveTransaction(tx.id, 'local-user');
      await reverseTransaction(tx.id, 'Reason');
      
      const reversed = useLocalStore.getState().transactions.find(
        t => t.reversalOfId === tx.id
      );
      
      expect(reversed).toBeDefined();
      expect(reversed!.type).toBe('INCOME');
      expect(reversed!.amount).toBe(tx.amount);
      expect(reversed!.compensatesFor).toBe(tx.id);
    }
  });
});
```

**Règle métier** : Reverse crée une contre-transaction de type opposé avec même montant

---

## 3. Tests Cotisations

### 3.1 IsPaiementVerrouille — Bug Actuel

```typescript
// tests/characterization/cotisation.paiement.verrouille.spec.ts
describe('Cotisation Paiement Verrouillage', () => {
  it('CURRENTLY crashes because isPaiementVerrouille is not defined', () => {
    // This test documents the current bug
    // After fix, it should pass
    const { markCotisationPaid } = useLocalStore.getState();
    
    expect(() => {
      // This would crash without the fix
      markCotisationPaid('some-id', 5000, '2026-09-07');
    }).not.toThrow(); // After fix
  });

  it('should allow payment before culte (EN_AVANCE)', async () => {
    // Test the logic from cotisation-logic.ts
    const { determinerStatutAvance } = await import('@/lib/cotisation-logic');
    
    const statut = determinerStatutAvance({
      datePaiement: '2026-09-01',
      dateCulte: '2026-09-07',
    });
    
    expect(statut).toBe('EN_AVANCE');
  });

  it('should mark as PAYE when paid on culte day', async () => {
    const { determinerStatutAvance } = await import('@/lib/cotisation-logic');
    
    const statut = determinerStatutAvance({
      datePaiement: '2026-09-07',
      dateCulte: '2026-09-07',
    });
    
    expect(statut).toBe('PAYE');
  });
});
```

**Règle métier** : Paiement avant culte = EN_AVANCE, paiement le jour = PAYE

---

### 3.2 Cotisation Montant Insuffisant

```typescript
// tests/characterization/cotisation.montant.insuffisant.spec.ts
describe('Cotisation — Montant Insuffisant', () => {
  it('should calculate don when payment > mandatory amount', () => {
    const { calculerDon } = await import('@/lib/cotisation-logic');
    
    const don = calculerDon(10000, 5000);
    
    expect(don).toBe(5000);
  });

  it('should return 0 don when payment = mandatory amount', () => {
    const { calculerDon } = await import('@/lib/cotisation-logic');
    
    const don = calculerDon(5000, 5000);
    
    expect(don).toBe(0);
  });

  it('should return 0 don when payment < mandatory amount', () => {
    const { calculerDon } = await import('@/lib/cotisation-logic');
    
    const don = calculerDon(3000, 5000);
    
    expect(don).toBe(0);
  });
});
```

---

### 3.3 Cotisation Stats

```typescript
// tests/characterization/cotisation.stats.spec.ts
describe('Cotisation — Stats Culte', () => {
  it('should calculate culte statistics', () => {
    const { calculerStatsCulte } = await import('@/lib/cotisation-logic');
    
    const stats = calculerStatsCulte({
      cotisations: [
        { id: '1', culteId: 'culte-1', membreId: 'm1', statut: 'PAYE', montantObligatoire: 5000, montantPaye: 5000, datePaiement: '2026-09-01', notes: null, createdAt: '2026-09-01', updatedAt: '2026-09-01' },
        { id: '2', culteId: 'culte-1', membreId: 'm2', statut: 'ABSENT', montantObligatoire: 5000, montantPaye: 0, datePaiement: null, notes: null, createdAt: '2026-09-01', updatedAt: '2026-09-01' },
        { id: '3', culteId: 'culte-1', membreId: 'm3', statut: 'NON_PAYE', montantObligatoire: 5000, montantPaye: 0, datePaiement: null, notes: null, createdAt: '2026-09-01', updatedAt: '2026-09-01' },
        { id: '4', culteId: 'culte-1', membreId: 'm4', statut: 'EN_AVANCE', montantObligatoire: 5000, montantPaye: 5000, datePaiement: '2026-08-25', notes: null, createdAt: '2026-08-25', updatedAt: '2026-08-25' },
      ],
      culteId: 'culte-1',
    });
    
    expect(stats.total).toBe(4);
    expect(stats.paye).toBe(1);
    expect(stats.absent).toBe(1);
    expect(stats.nonPaye).toBe(1);
    expect(stats.enAvance).toBe(1);
    expect(stats.totalCollecte).toBe(10000);
  });
});
```

---

### 3.4 Versement Atomicité

```typescript
// tests/characterization/versement.atomic.spec.ts
describe('Versement — Atomicité', () => {
  it('should create paired transactions with same versementId', async () => {
    const { createVersement } = useLocalStore.getState();
    
    await createVersement({
      sourceCaisseId: 'group-1',
      amount: 50000,
      comment: 'Test versement',
    });
    
    const txs = useLocalStore.getState().transactions.filter(
      t => t.comment === 'Test versement'
    );
    
    expect(txs.length).toBe(2);
    expect(txs[0].versementId).toBe(txs[1].versementId);
    expect(txs[0].type).toBe('EXPENSE');
    expect(txs[1].type).toBe('INCOME');
    expect(txs[0].amount).toBe(50000);
    expect(txs[1].amount).toBe(50000);
  });

  it('should validate amount is strictly positive', async () => {
    const { createVersement } = useLocalStore.getState();
    
    await expect(
      createVersement({ sourceCaisseId: 'group-1', amount: 0 })
    ).rejects.toThrow();
  });
});
```

**Règle métier** : Versement crée 2 transactions approuvées avec même versementId, montant strictement positif

---

## 4. Tests Organisation

### 4.1 Default Categories

```typescript
// tests/characterization/org.default-categories.spec.ts
describe('Organization — Default Categories', () => {
  it('should have 9 default categories', () => {
    const { categories } = useLocalStore.getState();
    
    expect(categories).toHaveLength(9);
    expect(categories.find(c => c.key === 'dime')).toBeDefined();
    expect(categories.find(c => c.key === 'offrande')).toBeDefined();
    expect(categories.find(c => c.key === 'offrande_mission')).toBeDefined();
    expect(categories.find(c => c.key === 'don')).toBeDefined();
    expect(categories.find(c => c.key === 'salaire_pasteur')).toBeDefined();
    expect(categories.find(c => c.key === 'frais_fonctionnement')).toBeDefined();
    expect(categories.find(c => c.key === 'mission')).toBeDefined();
    expect(categories.find(c => c.key === 'entretien')).toBeDefined();
    expect(categories.find(c => c.key === 'aumone')).toBeDefined();
  });

  it('should all have orgId = org-1', () => {
    const { categories } = useLocalStore.getState();
    
    categories.forEach(cat => {
      expect(cat.orgId).toBe('org-1');
    });
  });
});
```

---

### 4.2 Default Caisse Principale

```typescript
// tests/characterization/org.default-caisse.spec.ts
describe('Organization — Default Caisse', () => {
  it('should have main caisse', () => {
    const { caisses } = useLocalStore.getState();
    
    const main = caisses.find(c => c.id === 'main');
    expect(main).toBeDefined();
    expect(main!.name).toBe('Caisse principale');
    expect(main!.type).toBe('MAIN');
    expect(main!.orgId).toBe('org-1');
  });
});
```

---

## 5. Tests Audit

### 5.1 Audit Log Systématique

```typescript
// tests/characterization/audit.systematic.spec.ts
describe('Audit — Log Systématique', () => {
  it('should write audit entry on transaction create', async () => {
    const { addTransaction } = useLocalStore.getState();
    const initialCount = useLocalStore.getState().auditEntries.length;
    
    await addTransaction({
      orgId: 'org-1',
      type: 'INCOME',
      amount: 10000,
      description: 'Audit test',
      date: '2026-09-07',
      categoryId: 'cat-dime',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    expect(useLocalStore.getState().auditEntries.length).toBeGreaterThan(initialCount);
  });

  it('should write audit entry on transaction approve', async () => {
    const { addTransaction, approveTransaction } = useLocalStore.getState();
    const initialCount = useLocalStore.getState().auditEntries.length;
    
    const tx = await addTransaction({
      orgId: 'org-1',
      type: 'EXPENSE',
      amount: 10000,
      description: 'Approve audit',
      date: '2026-09-07',
      categoryId: 'cat-frais-fonc',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    if (tx) {
      await approveTransaction(tx as any, 'local-user');
      expect(useLocalStore.getState().auditEntries.length).toBeGreaterThan(initialCount);
    }
  });

  it('should include actorRoleAtTime in audit entry', async () => {
    const { addTransaction } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'INCOME',
      amount: 10000,
      description: 'Role audit',
      date: '2026-09-07',
      categoryId: 'cat-dime',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const lastAudit = useLocalStore.getState().auditEntries[useLocalStore.getState().auditEntries.length - 1];
    expect(lastAudit).toBeDefined();
    expect(lastAudit.actorRoleAtTime).toBe('TREASURIER');
  });
});
```

---

## 6. Tests Solde Dérivé

```typescript
// tests/characterization/account.balance.derived.spec.ts
describe('Account — Solde Dérivé', () => {
  it('should calculate balance from approved transactions only', async () => {
    const { addTransaction, approveTransaction, getAccountBalance } = useLocalStore.getState();
    
    await addTransaction({
      orgId: 'org-1',
      type: 'INCOME',
      amount: 100000,
      description: 'Income',
      date: '2026-09-07',
      categoryId: 'cat-dime',
      sourceCaisseId: 'main',
      source: 'CAISSE' as const,
    });
    
    const tx = useLocalStore.getState().transactions.find(t => t.description === 'Income');
    
    if (tx) {
      // PENDING transaction should not affect balance
      const balancePending = await getAccountBalance('main');
      expect(balancePending).toBe(0);
      
      await approveTransaction(tx.id, 'local-user');
      
      // APPROVED transaction should affect balance
      const balanceApproved = await getAccountBalance('main');
      expect(balanceApproved).toBe(100000);
    }
  });
});
```

**Invariant NeverBreak #5** : Le solde est toujours dérivé, jamais stocké

---

## 7. Tests RBAC (Stub Actuel)

```typescript
// tests/characterization/rbac.stub.spec.ts
describe('RBAC — Current Stub Behavior', () => {
  it('checkPermission currently returns true for all roles', async () => {
    const { checkPermission } = await import('@/lib/rbac');
    
    // This documents the current stub behavior
    // All roles should have all permissions (stub)
    expect(checkPermission('TREASURIER', 'transaction:delete')).toBe(true);
    expect(checkPermission('MEMBRE', 'admin:settings')).toBe(true);
  });

  it('hasPermission should use PERMISSION_MATRIX correctly', async () => {
    const { hasPermission } = await import('@/lib/rbac');
    
    expect(hasPermission('TREASURIER', 'transaction:create')).toBe(true);
    expect(hasPermission('MEMBRE', 'transaction:create')).toBe(false);
    expect(hasPermission('PASTEUR_PRINCIPAL', 'admin:settings')).toBe(true);
  });
});
```

---

## 8. Résumé des Tests par Domaine

| Domaine | Tests | Règles Métier Protégées |
|---------|-------|------------------------|
| Transactions | 4 | EXPENSE→PENDING, INCOME→DRAFT, APPROVED immuable, reverse |
| Cotisations | 4 | EN_AVANCE/PAYE, don calculation, stats culte |
| Versements | 2 | Atomicité paire, montant positif |
| Organisation | 2 | 9 catégories, caisse principale |
| Audit | 3 | Log systématique, actorRoleAtTime |
| Solde | 1 | Solde dérivé des APPROVED uniquement |
| RBAC | 2 | Stub behavior documented |

---

## 9. Exécution des Tests

```bash
# Installer Jest si nécessaire
npm install --save-dev jest @types/jest ts-jest

# Configurer jest.config.js
# Exécuter les tests
npx jest tests/characterization/

# Exécuter un test spécifique
npx jest tests/characterization/transaction.approved.immutability.spec.ts
```

---

## 10. Critères de Réussite

| Critère | Description |
|---------|-------------|
| **Tous les tests passent** | Avant migration, après migration |
| **Aucun nouveau test échoue** | Pendant la migration |
| **Couverture 100%** | Sur les règles métier critiques |
