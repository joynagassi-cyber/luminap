# Plan de Tests et Gates

> Date : 2026-09-05
> Objet : Critères de validation par domaine migré

---

## Gate 0 : Prérequis

Avant de commencer toute migration, vérifier :

- [ ] Backup complet de la base Supabase
- [ ] Backup complet de l'IndexedDB (export des données locales)
- [ ] Tous les tests e2e existants passent
- [ ] Documentation des données existantes (comptage des lignes par table)

---

## Gate 1 : Transaction — Immunité des Approuvées

### Tests Unitaires

```typescript
// src/__tests__/store/transaction-immunity.spec.ts
describe('Transaction immunité', () => {
  it('ne doit pas permettre la modification d\'une transaction APPROVED', async () => {
    const store = useLocalStore.getState();
    const tx = { id: 'test-tx', status: 'APPROVED' as const };
    await expect(store.updateTransaction(tx.id, { description: 'test' }))
      .rejects.toThrow('Transaction approuvée est immuable');
  });
  
  it('ne doit pas permettre la suppression d\'une transaction APPROVED', async () => {
    const store = useLocalStore.getState();
    const tx = { id: 'test-tx', status: 'APPROVED' as const };
    await expect(store.deleteTransaction(tx.id))
      .rejects.toThrow('Transaction approuvée est immuable');
  });
  
  it('doit permettre la modification d\'une transaction DRAFT', async () => {
    const store = useLocalStore.getState();
    const tx = { id: 'test-tx', status: 'DRAFT' as const };
    await store.updateTransaction(tx.id, { description: 'test' });
    // Should not throw
  });
  
  it('doit permettre la suppression d\'une transaction DRAFT', async () => {
    const store = useLocalStore.getState();
    const tx = { id: 'test-tx', status: 'DRAFT' as const };
    await store.deleteTransaction(tx.id);
    // Should not throw
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/transaction-immunity.spec.ts
test('user cannot edit approved transaction', async ({ page }) => {
  await page.goto('/transaction/test-approved-tx/edit');
  await expect(page.getByRole('button', { name: /modifier/i })).toBeDisabled();
  await expect(page.getByText(/immuable|non modifiable/i)).toBeVisible();
});

test('user cannot delete approved transaction', async ({ page }) => {
  await page.goto('/transaction/test-approved-tx');
  await page.getByRole('button', { name: /supprimer/i }).click();
  await expect(page.getByText(/immuable|non supprimable/i)).toBeVisible();
});
```

### Contrôle d'Intégrité des Données

```sql
-- Vérifier qu'aucune transaction APPROVED n'a été modifiée ou supprimée accidentellement
SELECT count(*) FROM transactions WHERE status = 'APPROVED' AND updated_at > NOW() - INTERVAL '1 hour';
-- Doit être 0 après la migration
```

### ✅ Gate 1 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Aucune transaction APPROVED n'a été modifiée/supprimée accidentellement
- [ ] Les transactions DRAFT/PENDING/REJECTED peuvent encore être éditées

---

## Gate 2 : Organization — Migration Caisses→Accounts

### Tests Unitaires

```typescript
// src/__tests__/store/group-migration.spec.ts
describe('Group creation with accounts', () => {
  it('doit créer un account canonique lors de la création d\'un groupe', async () => {
    const store = useLocalStore.getState();
    await store.createGroup({ name: 'Test', type: 'groupe', description: 'Desc', color: '#FF6B00' });
    const account = await store.accounts.find(a => a.ownerType === 'GROUP');
    expect(account).toBeDefined();
    expect(account?.ownerType).toBe('GROUP');
  });
  
  it('doit créer un account ORGANIZATION pour main', async () => {
    const store = useLocalStore.getState();
    const account = store.accounts.find(a => a.id === 'main');
    expect(account).toBeDefined();
    expect(account?.ownerType).toBe('ORGANIZATION');
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/group-migration.spec.ts
test('group creation syncs to accounts table', async ({ page }) => {
  await page.goto('/groups');
  await page.getByRole('button', { name: /créer/i }).click();
  await page.getByPlaceholder('Nom du groupe').fill('Nouveau Groupe');
  await page.getByRole('button', { name: /créer le groupe/i }).click();
  // Verify the account was created in Supabase
  const accounts = await page.evaluate(async () => {
    const resp = await fetch('/api/data');
    return resp.json();
  });
  expect(accounts.accounts).toContainEqual(expect.objectContaining({ ownerType: 'GROUP' }));
});
```

### Contrôle d'Intégrité des Données

```sql
-- Vérifier que tous les groupes ont un account correspondant
SELECT g.id, a.id as account_id
FROM groups g
LEFT JOIN accounts a ON g.id = a.owner_id AND a.owner_type = 'GROUP'
WHERE a.id IS NULL;
-- Doit retourner 0 lignes

-- Vérifier que les transactions pointent toujours vers des accounts valides
SELECT t.id, t.source_caisse_id, a.id as account_id
FROM transactions t
LEFT JOIN accounts a ON t.source_caisse_id = a.id
WHERE a.id IS NULL AND t.source_caisse_id IS NOT NULL;
-- Doit retourner 0 lignes
```

### ✅ Gate 2 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Chaque groupe a un account canonique correspondant
- [ ] Aucune transaction ne pointe vers une caisse inexistante
- [ ] Le dashboard affiche correctement les soldes
- [ ] Le versement fonctionne avec le nouveau système

---

## Gate 3 : Versement Canonique

### Tests Unitaires

```typescript
// src/__tests__/versement/versement-canonical.spec.ts
describe('Canonical versement', () => {
  it('doit créer un enregistrement versement', async () => {
    const store = useLocalStore.getState();
    const versementId = await store.createVersement({
      fromAccountId: 'org-diactes',
      toAccountId: 'main',
      amountCents: 50000,
      date: '2024-01-01',
      createdBy: 'local-user',
    });
    expect(versementId).toBeDefined();
    const versement = await db.get('versements', versementId);
    expect(versement).toBeDefined();
    expect(versement?.status).toBe('DRAFT');
  });
  
  it('doit créer 2 transactions liées', async () => {
    const store = useLocalStore.getState();
    const versementId = await store.createVersement({
      fromAccountId: 'org-diactes',
      toAccountId: 'main',
      amountCents: 50000,
      date: '2024-01-01',
      createdBy: 'local-user',
    });
    const txs = store.transactions.filter(t => t.versementId === versementId);
    expect(txs).toHaveLength(2);
    expect(txs.some(t => t.type === 'EXPENSE')).toBe(true);
    expect(txs.some(t => t.type === 'INCOME')).toBe(true);
  });
  
  it('doit avoir le même versementId sur les 2 transactions', async () => {
    const store = useLocalStore.getState();
    const versementId = await store.createVersement({
      fromAccountId: 'org-diactes',
      toAccountId: 'main',
      amountCents: 50000,
      date: '2024-01-01',
      createdBy: 'local-user',
    });
    const txs = store.transactions.filter(t => t.versementId === versementId);
    expect(txs.every(t => t.versementId === versementId)).toBe(true);
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/versement-canonical.spec.ts
test('versement creates paired transactions', async ({ page }) => {
  await page.goto('/versement');
  await page.getByRole('button', { name: /diacres/i }).click();
  await page.getByPlaceholder('0').fill('1000');
  await page.getByRole('button', { name: /aperçu/i }).click();
  await page.getByRole('button', { name: /confirmer/i }).click();
  // Verify versement was recorded
  const versements = await page.evaluate(async () => {
    const resp = await fetch('/api/data');
    return resp.json();
  });
  expect(versements.versements).toHaveLength(1);
});
```

### Contrôle d'Intégrité des Données

```sql
-- Vérifier que chaque versement a exactement 2 transactions
SELECT v.id, COUNT(t.id) as tx_count
FROM versements v
LEFT JOIN transactions t ON v.id = t.versement_id
GROUP BY v.id
HAVING COUNT(t.id) != 2;
-- Doit retourner 0 lignes
```

### ✅ Gate 3 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Chaque versement a exactement 2 transactions liées
- [ ] Les 2 transactions ont le même versementId
- [ ] Une transaction est EXPENSE, l'autre INCOME
- [ ] Les montants sont identiques

---

## Gate 4 : Sync Complet

### Tests Unitaires

```typescript
// src/__tests__/sync/sync-complete.spec.ts
describe('Complete sync', () => {
  it('doit sync les accounts vers le cloud', async () => {
    // Mock supabase
    const store = useLocalStore.getState();
    await store.createGroup({ name: 'Sync Test', type: 'groupe', description: 'Desc', color: '#FF6B00' });
    // Verify sync queue has account entry
    const queue = await db.getSyncQueue();
    expect(queue.some(q => q.entityType === 'accounts')).toBe(true);
  });
  
  it('doit sync les versements vers le cloud', async () => {
    const store = useLocalStore.getState();
    await store.createVersement({ ... });
    const queue = await db.getSyncQueue();
    expect(queue.some(q => q.entityType === 'versements')).toBe(true);
  });
  
  it('doit sync les groupes vers le cloud', async () => {
    const store = useLocalStore.getState();
    await store.createGroup({ name: 'Sync Test', type: 'groupe', description: 'Desc', color: '#FF6B00' });
    const queue = await db.getSyncQueue();
    expect(queue.some(q => q.entityType === 'groups')).toBe(true);
  });
  
  it('doit sync les membres vers le cloud', async () => {
    const store = useLocalStore.getState();
    await store.createMember({ firstName: 'Test', lastName: 'User', ... });
    const queue = await db.getSyncQueue();
    expect(queue.some(q => q.entityType === 'members')).toBe(true);
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/sync-complete.spec.ts
test('all entities sync to cloud', async ({ page }) => {
  // Create group
  await page.goto('/groups');
  await page.getByRole('button', { name: /créer/i }).click();
  await page.getByPlaceholder('Nom du groupe').fill('Sync Group');
  await page.getByRole('button', { name: /créer le groupe/i }).click();
  
  // Create member
  await page.goto('/members');
  await page.getByRole('button', { name: /ajouter/i }).click();
  await page.getByPlaceholder('Prénom').fill('Sync');
  await page.getByPlaceholder('Nom').fill('Member');
  await page.getByRole('button', { name: /créer le membre/i }).click();
  
  // Verify cloud data
  const cloudData = await page.evaluate(async () => {
    const resp = await fetch('/api/data');
    return resp.json();
  });
  expect(cloudData.groups).toContainEqual(expect.objectContaining({ name: 'Sync Group' }));
  expect(cloudData.members).toContainEqual(expect.objectContaining({ firstName: 'Sync' }));
});
```

### Contrôle d'Intégrité des Données

```sql
-- Vérifier que toutes les entités locales ont une contrepartie cloud
SELECT 'accounts' as entity, count(*) as missing
FROM accounts a
LEFT JOIN (SELECT id FROM accounts) cloud ON a.id = cloud.id
WHERE cloud.id IS NULL;
-- Doit retourner 0
```

### ✅ Gate 4 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Toutes les entités sont sync vers le cloud
- [ ] Le realtime fonctionne pour toutes les entités
- [ ] Aucune donnée n'est perdue lors d'une réinstallation

---

## Gate 5 : Event Budget — Migration jsonb→tables

### Tests Unitaires

```typescript
// src/__tests__/event-budget/migration.spec.ts
describe('Event budget migration', () => {
  it('doit migrer les budget_items jsonb vers event_budgets et budget_lines', async () => {
    // Mock event avec budget_items
    const event = { id: 'test-event', budget_items: [{ label: 'Test', allocated: 10000, spent: 0 }] };
    await migrateEventBudget(event.id, event.budget_items);
    
    const budget = await db.get('event_budgets', event.id);
    expect(budget).toBeDefined();
    
    const lines = await db.getAll('budget_lines');
    expect(lines).toHaveLength(1);
    expect(lines[0].plannedAmountCents).toBe(10000);
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/event-budget-migration.spec.ts
test('event budget migration preserves data', async ({ page }) => {
  // Create event with budget
  await page.goto('/event/new');
  await page.getByPlaceholder('Nom de l\'événement').fill('Test Event');
  await page.getByRole('button', { name: /créer/i }).click();
  
  // Add budget item
  await page.getByRole('button', { name: /ajouter un poste/i }).click();
  await page.getByPlaceholder('Libellé').fill('Test Item');
  await page.getByPlaceholder('Montant alloué').fill('1000');
  await page.getByRole('button', { name: /ajouter/i }).click();
  
  // Verify migration
  const budgetData = await page.evaluate(async () => {
    const resp = await fetch('/api/data');
    return resp.json();
  });
  expect(budgetData.budget_lines).toHaveLength(1);
  expect(budgetData.budget_lines[0].plannedAmountCents).toBe(100000);
});
```

### Contrôle d'Intégrité des Données

```sql
-- Vérifier que tous les events avec budget_items ont des budget_lines
SELECT e.id, count(bl.id) as line_count
FROM events e
LEFT JOIN event_budgets eb ON e.id = eb.event_id
LEFT JOIN budget_lines bl ON eb.id = bl.event_budget_id
WHERE e.budget_items != '[]'::jsonb
GROUP BY e.id
HAVING count(bl.id) = 0;
-- Doit retourner 0 lignes
```

### ✅ Gate 5 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Toutes les données jsonb ont été migrées
- [ ] Aucune donnée n'est perdue
- [ ] Le calcul des totaux fonctionne

---

## Gate 6 : Archive Integration

### Tests Unitaires

```typescript
// src/__tests__/archive/archive-integration.spec.ts
describe('Archive integration', () => {
  it('doit utiliser ArchiveRegistry pour archiver un groupe', async () => {
    const store = useLocalStore.getState();
    await store.archiveGroup('test-group', 'Reason', 'local-user');
    // Verify audit entry
    const audits = await db.getAll('auditEntries');
    expect(audits.some(a => a.action === 'ARCHIVE' && a.entityType === 'Group')).toBe(true);
  });
  
  it('doit rejeter l\'archive d\'un groupe avec solde non nul', async () => {
    await expect(store.archiveGroup('test-group-with-balance', 'Reason', 'local-user'))
      .rejects.toThrow('Cannot archive group with non-zero balance');
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/archive-integration.spec.ts
test('archive and restore group', async ({ page }) => {
  await page.goto('/groups');
  // Archive a group
  await page.getByRole('button', { name: /supprimer/i }).first().click();
  await page.getByRole('button', { name: /supprimer/i }).click();
  
  // Verify in archives
  await page.goto('/archives');
  await expect(page.getByText(/groupe/i)).toBeVisible();
  
  // Restore
  await page.getByRole('button', { name: /restaurer/i }).click();
  await expect(page.getByText(/aucune archive/i)).toBeVisible();
});
```

### ✅ Gate 6 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] L'archive crée une entrée audit
- [ ] La restauration crée une entrée audit
- [ ] Un groupe avec solde non nul ne peut pas être archivé

---

## Gate 7 : Formulaires

### Tests Unitaires

```typescript
// src/__tests__/forms/form-builder.spec.ts
describe('Form builder', () => {
  it('doit créer un formulaire', async () => {
    const store = useLocalStore.getState();
    const form = await formDefinitionRepo.create({
      orgId: 'org-1',
      key: 'test-form',
      name: 'Test Form',
      status: 'DRAFT',
      fields: [],
    });
    expect(form.id).toBeDefined();
  });
  
  it('doit valider une soumission', async () => {
    const form = { key: 'test', fields: [{ key: 'name', required: true }] };
    const result = validateFormSubmission(form as any, { name: '' });
    expect(result.valid).toBe(false);
  });
});
```

### Tests d'Intégration

```typescript
// e2e-tests/forms.spec.ts
test('create and submit form', async ({ page }) => {
  await page.goto('/forms');
  await page.getByRole('button', { name: /créer/i }).click();
  await page.getByPlaceholder('Nom du formulaire').fill('Test Form');
  await page.getByRole('button', { name: /créer/i }).click();
  
  // Fill and submit
  await page.getByRole('link', { name: /remplir/i }).click();
  await page.getByPlaceholder('Name').fill('Test User');
  await page.getByRole('button', { name: /soumettre/i }).click();
  
  expect(page.url()).toContain('/forms');
});
```

### ✅ Gate 7 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests e2e passent
- [ ] Un formulaire peut être créé, publié, archivé
- [ ] Une soumission peut être faite et validée
- [ ] Les champs personnalisés fonctionnent

---

## Gate 8 : Custom Fields

### Tests Unitaires

```typescript
// src/__tests__/custom-fields.spec.ts
describe('Custom fields', () => {
  it('doit créer un champ personnalisé', async () => {
    const def = await customFieldRepo.create({
      orgId: 'org-1',
      entityType: 'Member',
      key: 'test-field',
      label: 'Test Field',
      type: 'text',
      order: 0,
    });
    expect(def.id).toBeDefined();
  });
  
  it('doit associer une valeur à un entity', async () => {
    const value = await customFieldValueRepo.upsert({
      entityType: 'Member',
      entityId: 'test-member',
      customFieldDefinitionId: 'test-def',
      value: 'test-value',
    });
    expect(value.id).toBeDefined();
  });
});
```

### ✅ Gate 8 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Les champs personnalisés peuvent être créés et associés
- [ ] Les valeurs sont correctement stockées en jsonb

---

## Gate 9 : Reporting Builder

### Tests Unitaires

```typescript
// src/__tests__/reporting/report-builder.spec.ts
describe('Report builder', () => {
  it('doit créer un rapport', async () => {
    const report = await reportBuilder.create({
      orgId: 'org-1',
      name: 'Test Report',
      dataSource: 'transactions',
      dimensions: ['month'],
      metrics: [{ field: 'amount', fn: 'sum' }],
      filters: [],
      groupBy: ['month'],
    });
    expect(report.id).toBeDefined();
  });
  
  it('doit exécuter un rapport', async () => {
    const result = await reportEngine.execute({
      dataSource: 'transactions',
      dimensions: [],
      metrics: [{ field: 'amount', fn: 'sum' }],
      filters: [],
      groupBy: [],
    } as any);
    expect(result.rows).toBeDefined();
    expect(result.columns).toBeDefined();
  });
});
```

### ✅ Gate 9 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Un rapport peut être créé et exécuté
- [ ] Les résultats sont corrects

---

## Gate 10 : GroupMembership UI

### Tests Unitaires

```typescript
// src/__tests__/group-membership.spec.ts
describe('Group membership', () => {
  it('doit ajouter un membre à un groupe', async () => {
    const store = useLocalStore.getState();
    await store.addMemberToGroup({
      memberId: 'test-member',
      groupId: 'test-group',
      roleInGroup: 'MEMBRE',
    });
    const memberships = store.memberships;
    expect(memberships).toHaveLength(1);
  });
  
  it('doit retirer un membre d\'un groupe', async () => {
    const store = useLocalStore.getState();
    await store.removeMemberFromGroup('test-membership');
    const memberships = store.memberships;
    expect(memberships).toHaveLength(0);
  });
});
```

### ✅ Gate 10 Conditions

- [ ] Tous les tests unitaires passent
- [ ] Un membre peut être ajouté/retiré d'un groupe

---

## Gate 11 : Account UI

### Tests Unitaires

```typescript
// src/__tests__/accounts-ui.spec.ts
describe('Account UI', () => {
  it('doit afficher tous les comptes', async () => {
    const store = useLocalStore.getState();
    const accounts = await accountRepo.list();
    expect(accounts).toContainEqual(expect.objectContaining({ id: 'main' }));
  });
  
  it('doit calculer le solde correctement', async () => {
    const balance = await getAccountBalance('main');
    expect(typeof balance).toBe('number');
  });
});
```

### ✅ Gate 11 Conditions

- [ ] Tous les tests unitaires passent
- [ ] La page Accounts affiche correctement les soldes

---

## Ordre de Passage des Gates

| Gate | Domaine | Blocé par |
|------|---------|-----------|
| 0 | Prérequis | — |
| 1 | Transaction immunité | Gate 0 |
| 2 | Migration caisses→accounts | Gate 1 |
| 3 | Versement canonique | Gate 2 |
| 4 | Sync complet | Gate 2 |
| 5 | Event Budget migration | Gate 2 |
| 6 | Archive integration | Gate 1 |
| 7 | Formulaires | Gate 4 |
| 8 | Custom Fields | Gate 4 |
| 9 | Reporting Builder | Gate 4 |
| 10 | GroupMembership UI | Gate 4 |
| 11 | Account UI | Gate 2 |
