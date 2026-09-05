# Spécification Technique par Feature

> Date : 2026-09-05
> Objet : Spécifications détaillées pour chaque feature à créer ou migrer

---

## Feature 1 : Transaction Immunité

### Schéma SQL
Aucune modification — changement code uniquement.

### Interface TypeScript

```typescript
// src/types/index.ts — ajouter à Transaction
interface Transaction {
  // ... existing fields ...
  isImmutable?: boolean; // true si APPROVED
}
```

### Repository

Aucun changement — utilisation du store existant.

### Use Cases

```typescript
// src/store/useLocalStore.ts
async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  const oldTx = get().transactions.find(t => t.id === id);
  if (oldTx?.status === 'APPROVED') {
    throw new Error('Transaction approuvée est immuable');
  }
  // ... existing logic ...
}

async deleteTransaction(id: string): Promise<void> {
  const oldTx = get().transactions.find(t => t.id === id);
  if (oldTx?.status === 'APPROVED') {
    throw new Error('Transaction approuvée est immuable');
  }
  // ... existing logic ...
}
```

### Mapping Tables/Colonnes
- `transactions` — aucune modification

---

## Feature 2 : Migration Caisses → Accounts

### Schéma SQL (proposition)

```sql
-- 1. Créer les accounts à partir des caisses
INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
SELECT id, org_id, 'GROUP', id, name, 'XOF', 'ACTIVE', created_at, updated_at
FROM caisses WHERE type = 'GROUP';

INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
SELECT 'main', 'org-1', 'ORGANIZATION', 'org-1', 'Caisse principale', 'XOF', 'ACTIVE', NOW(), NOW();

-- 2. Mettre à jour les transactions existantes
-- Aucune modification nécessaire : sourceCaisseId pointe vers l'ID de la caisse/account

-- 3. Supprimer les caisses (après migration validée)
-- DROP TABLE caisses; -- À faire après validation
```

### Interface TypeScript

```typescript
// src/types/index.ts — Account existant
interface Account {
  id: string;
  orgId: string;
  ownerType: 'ORGANIZATION' | 'GROUP';
  ownerId: string;
  name: string;
  currency: string;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Repository

```typescript
// src/lib/accounts.ts (nouveau)
import { db } from './db';
import type { Account } from '@/types';

export const accountRepo = {
  async create(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry = { ...account, id, createdAt: now, updatedAt: now };
    await db.put('accounts', entry);
    return entry;
  },
  async get(id: string): Promise<Account | null> {
    return db.get<Account>('accounts', id).catch(() => null);
  },
  async list(filters?: { orgId?: string; status?: string }): Promise<Account[]> {
    const all = await db.getAll<Account>('accounts').catch(() => [] as Account[]);
    return all.filter(a => {
      if (filters?.orgId && a.orgId !== filters.orgId) return false;
      if (filters?.status && a.status !== filters.status) return false;
      return true;
    });
  },
  async update(id: string, data: Partial<Account>): Promise<Account | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    return { ...existing, ...data, updatedAt: new Date().toISOString() };
  },
  async delete(id: string): Promise<void> {
    await db.delete('accounts', id);
  },
};
```

### Use Cases

```typescript
// src/store/useLocalStore.ts — modify createGroup
async createGroup(data: { name: string; type: string; description: string; color: string }): Promise<void> {
  const id = generateId();
  const now = new Date().toISOString();
  
  // Créer le groupe canonique
  const group: Group = {
    id, orgId: 'org-1', name: data.name, parentGroupId: null,
    responsableMemberId: null, status: 'ACTIVE', archivedAt: null,
    archivedBy: null, archiveReason: null, createdAt: now, updatedAt: now
  };
  
  // Créer le compte canonique
  const account: Account = {
    id, orgId: 'org-1', ownerType: 'GROUP', ownerId: id,
    name: data.name, currency: 'XOF', status: 'ACTIVE',
    archivedAt: null, archivedBy: null, archiveReason: null,
    createdAt: now, updatedAt: now
  };
  
  // Sync vers les deux stores
  await db.put('groups', group);
  await db.put('accounts', account);
  
  // Sync cloud
  await enqueueSync({ id: `sync-group-${id}`, operation: 'create', entityType: 'groups', entityId: id, payload: group, attempts: 0, lastAttempt: null, createdAt: now });
  await enqueueSync({ id: `sync-account-${id}`, operation: 'create', entityType: 'accounts', entityId: id, payload: account, attempts: 0, lastAttempt: null, createdAt: now });
  
  // Audit
  await writeAudit({ orgId: 'org-1', transactionId: null, userId: get().user.id, actorRoleAtTime: get().user.role, action: 'CREATE', entityType: 'Group', entityId: id, beforeState: null, afterState: group, comment: null });
}
```

### Mapping Tables/Colonnes
- `accounts.id` ← `caisses.id`
- `accounts.name` ← `caisses.name`
- `accounts.org_id` ← `caisses.org_id`
- `accounts.owner_type` = `'GROUP'`
- `accounts.owner_id` ← `caisses.id`

---

## Feature 3 : Versement Canonique

### Schéma SQL
La table `versements` existe déjà — pas de migration.

### Interface TypeScript

```typescript
// src/types/index.ts — Versement existant
interface Versement {
  id: string;
  orgId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}
```

### Repository

```typescript
// src/lib/versements.ts (nouveau)
import { db } from './db';
import { generateId } from './utils';
import type { Versement } from '@/types';
import { writeAudit } from './audit';

export const versementRepo = {
  async create(versement: Omit<Versement, 'id' | 'createdAt'>): Promise<Versement> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: Versement = { ...versement, id, createdAt: now };
    await db.put('versements', entry);
    return entry;
  },
  async get(id: string): Promise<Versement | null> {
    return db.get<Versement>('versements', id).catch(() => null);
  },
  async list(filters?: { orgId?: string; status?: string }): Promise<Versement[]> {
    const all = await db.getAll<Versement>('versements').catch(() => [] as Versement[]);
    return all.filter(v => {
      if (filters?.orgId && v.orgId !== filters.orgId) return false;
      if (filters?.status && v.status !== filters.status) return false;
      return true;
    });
  },
  async approve(id: string, approvedBy: string): Promise<Versement> {
    const existing = await this.get(id);
    if (!existing) throw new Error('Versement not found');
    const updated: Versement = {
      ...existing,
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date().toISOString(),
    };
    await db.put('versements', updated);
    await writeAudit({
      orgId: existing.orgId, transactionId: null, userId: approvedBy,
      actorRoleAtTime: null, action: 'APPROVE', entityType: 'Versement',
      entityId: id, beforeState: existing, afterState: updated, comment: null
    });
    return updated;
  },
};
```

### Use Cases

```typescript
// src/store/useLocalStore.ts — nouvelle méthode
async createVersement(data: {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  createdBy: string;
}): Promise<string> {
  const versementId = generateId();
  const now = new Date().toISOString();
  
  // Créer le versement
  const versement: Versement = {
    id: versementId,
    orgId: 'org-1',
    fromAccountId: data.fromAccountId,
    toAccountId: data.toAccountId,
    amountCents: data.amountCents,
    date: data.date,
    status: 'DRAFT',
    createdBy: data.createdBy,
    approvedBy: null,
    approvedAt: null,
    createdAt: now,
  };
  await db.put('versements', versement);
  await enqueueSync({ id: `sync-versement-${versementId}`, operation: 'create', entityType: 'versements', entityId: versementId, payload: versement, attempts: 0, lastAttempt: null, createdAt: now });
  
  // Créer les 2 transactions liées
  const sourceTx: Transaction = {
    id: `${versementId}_src`,
    orgId: 'org-1',
    type: 'EXPENSE',
    amount: data.amountCents,
    description: `Versement vers ${data.toAccountId === 'main' ? 'caisse principale' : data.toAccountId}`,
    date: data.date,
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
    createdById: data.createdBy,
    approvedById: data.createdBy,
    approvedAt: now,
    categoryId: 'cat-dime',
    orgUnitId: null,
    eventId: null,
    source: 'CAISSE',
    personName: null,
    compensatesFor: null,
    comment: `Versement ${versementId}`,
    version: 1,
    sourceCaisseId: data.fromAccountId,
    versementId,
    reversalOfId: null,
  };
  const targetTx: Transaction = {
    id: `${versementId}_tgt`,
    orgId: 'org-1',
    type: 'INCOME',
    amount: data.amountCents,
    description: `Versement de ${data.fromAccountId === 'main' ? 'caisse principale' : data.fromAccountId}`,
    date: data.date,
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
    createdById: data.createdBy,
    approvedById: data.createdBy,
    approvedAt: now,
    categoryId: 'cat-dime',
    orgUnitId: null,
    eventId: null,
    source: 'CAISSE',
    personName: null,
    compensatesFor: null,
    comment: `Versement ${versementId}`,
    version: 1,
    sourceCaisseId: data.toAccountId,
    versementId,
    reversalOfId: null,
  };
  
  await db.put('transactions', sourceTx);
  await db.put('transactions', targetTx);
  await enqueueSync({ id: `sync-tx-${sourceTx.id}`, operation: 'create', entityType: 'transactions', entityId: sourceTx.id, payload: sourceTx, attempts: 0, lastAttempt: null, createdAt: now });
  await enqueueSync({ id: `sync-tx-${targetTx.id}`, operation: 'create', entityType: 'transactions', entityId: targetTx.id, payload: targetTx, attempts: 0, lastAttempt: null, createdAt: now });
  
  return versementId;
}
```

### Mapping Tables/Colonnes
- `versements.id` → `versementId` sur les transactions
- `versements.from_account_id` → `sourceCaisseId` sur la transaction source
- `versements.to_account_id` → `sourceCaisseId` sur la transaction cible

---

## Feature 4 : Sync Complet

### Schéma SQL
Aucune modification — ajout de handlers.

### Code à ajouter dans `src/lib/sync.ts`

```typescript
// Dans la fonction syncCycle, ajouter dans le switch :
case 'accounts':
  if (item.operation === 'create') {
    await supabase.from('accounts').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('accounts').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('accounts').delete().eq('id', item.entityId);
  }
  break;
case 'versements':
  if (item.operation === 'create') {
    await supabase.from('versements').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('versements').update(item.payload).eq('id', item.entityId);
  }
  break;
case 'groups':
  if (item.operation === 'create') {
    await supabase.from('groups').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('groups').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('groups').delete().eq('id', item.entityId);
  }
  break;
case 'members':
  if (item.operation === 'create') {
    await supabase.from('members').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('members').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('members').delete().eq('id', item.entityId);
  }
  break;
case 'groupMemberships':
  if (item.operation === 'create') {
    await supabase.from('group_memberships').insert(item.payload);
  } else if (item.operation === 'delete') {
    await supabase.from('group_memberships').delete().eq('id', item.entityId);
  }
  break;
case 'form_definitions':
  if (item.operation === 'create') {
    await supabase.from('form_definitions').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('form_definitions').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('form_definitions').delete().eq('id', item.entityId);
  }
  break;
case 'form_submissions':
  if (item.operation === 'create') {
    await supabase.from('form_submissions').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('form_submissions').update(item.payload).eq('id', item.entityId);
  }
  break;
case 'custom_field_definitions':
  if (item.operation === 'create') {
    await supabase.from('custom_field_definitions').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('custom_field_definitions').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('custom_field_definitions').delete().eq('id', item.entityId);
  }
  break;
case 'custom_field_values':
  if (item.operation === 'create') {
    await supabase.from('custom_field_values').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('custom_field_values').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('custom_field_values').delete().eq('id', item.entityId);
  }
  break;
case 'report_definitions':
  if (item.operation === 'create') {
    await supabase.from('report_definitions').insert(item.payload);
  } else if (item.operation === 'update') {
    await supabase.from('report_definitions').update(item.payload).eq('id', item.entityId);
  } else if (item.operation === 'delete') {
    await supabase.from('report_definitions').delete().eq('id', item.entityId);
  }
  break;
```

---

## Feature 5 : Event Budget — Migration jsonb→tables

### Schéma SQL (proposition)

```sql
-- Migration des données existantes
DO $$
DECLARE
  rec RECORD;
  budget_id UUID;
  line_id UUID;
BEGIN
  FOR rec IN SELECT id, budget_items FROM events WHERE budget_items IS NOT NULL AND budget_items != '[]'::jsonb
  LOOP
    -- Créer event_budget
    INSERT INTO event_budgets (id, event_id, currency, created_at)
    VALUES (gen_random_uuid(), rec.id, 'XOF', NOW())
    RETURNING id INTO budget_id;
    
    -- Créer budget_lines
    FOR line IN SELECT * FROM jsonb_array_elements(rec.budget_items)
    LOOP
      line_id := gen_random_uuid();
      INSERT INTO budget_lines (id, event_budget_id, category_id, planned_amount_cents, actual_amount_cents, created_at)
      VALUES (line_id, budget_id, 
              COALESCE((line.value->>'categoryId')::text, 'cat-dime'),
              COALESCE((line.value->>'allocated')::bigint, 0),
              COALESCE((line.value->>'spent')::bigint, 0),
              NOW());
    END LOOP;
  END LOOP;
END $$;
```

### Interface TypeScript

```typescript
// src/types/index.ts — EventBudget et BudgetLine existants
interface EventBudget {
  id: string;
  eventId: string;
  currency: string;
  revisedAt: string | null;
  revisedBy: string | null;
  createdAt: string;
}

interface BudgetLine {
  id: string;
  eventBudgetId: string;
  categoryId: string;
  plannedAmountCents: number;
  actualAmountCents: number;
  createdAt: string;
}
```

### Repository

```typescript
// src/lib/eventBudgets.ts (nouveau)
import { db } from './db';
import { generateId } from './utils';
import type { EventBudget, BudgetLine } from '@/types';

export const eventBudgetRepo = {
  async create(eventId: string): Promise<EventBudget> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: EventBudget = { id, eventId, currency: 'XOF', revisedAt: null, revisedBy: null, createdAt: now };
    await db.put('event_budgets', entry);
    return entry;
  },
  async getForEvent(eventId: string): Promise<EventBudget | null> {
    const all = await db.getAll<EventBudget>('event_budgets').catch(() => [] as EventBudget[]);
    return all.find(b => b.eventId === eventId) ?? null;
  },
  async addLine(budgetId: string, categoryId: string, plannedCents: number): Promise<BudgetLine> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: BudgetLine = { id, eventBudgetId: budgetId, categoryId, plannedAmountCents: plannedCents, actualAmountCents: 0, createdAt: now };
    await db.put('budget_lines', entry);
    return entry;
  },
  async removeLine(lineId: string): Promise<void> {
    await db.delete('budget_lines', lineId);
  },
};
```

### Use Cases

```typescript
// src/store/useLocalStore.ts — modifier addBudgetItem
async addBudgetItem(eventId: string, item: Omit<BudgetItem, 'id'>): Promise<void> {
  // 1. Créer ou récupérer le EventBudget
  const budget = await eventBudgetRepo.getForEvent(eventId);
  const budgetId = budget?.id ?? (await eventBudgetRepo.create(eventId)).id;
  
  // 2. Créer la BudgetLine
  await eventBudgetRepo.addLine(budgetId, item.categoryId ?? 'cat-dime', item.allocated);
  
  // 3. Mettre à jour l'événement local (pour compatibilité)
  const event = get().events.find(e => e.id === eventId);
  if (event) {
    const newItems = [...event.budgetItems, { id: generateId(), ...item }];
    const total = newItems.reduce((s, i) => s + i.allocated, 0);
    await get().updateEvent(eventId, { budgetItems: newItems, budget: total });
  }
}
```

---

## Feature 6 : Archive Integration

### Schéma SQL
Aucune modification.

### Code

```typescript
// src/lib/archiveService.ts — enregistrer les policies
export function registerArchivePolicies() {
  // Group
  archiveRegistry.register('Group', {
    canArchive: async (id) => {
      const group = await db.get<Group>('groups', id);
      if (!group) return { ok: false, reason: 'Group not found' };
      if (group.status === 'ARCHIVED') return { ok: false, reason: 'Already archived' };
      // Check balance
      const account = await db.get<Account>('accounts', id);
      if (account) {
        const balance = await getAccountBalance(id);
        if (balance !== 0) return { ok: false, reason: 'Cannot archive group with non-zero balance' };
      }
      return { ok: true };
    },
    onArchive: async (id) => {
      // Deactivate related entities
    },
    canRestore: async (id) => {
      const group = await db.get<Group>('groups', id);
      if (!group || group.status !== 'ARCHIVED') return { ok: false, reason: 'Group not archived' };
      return { ok: true };
    },
  });
  
  // Member
  archiveRegistry.register('Member', {
    canArchive: async (id) => {
      const member = await db.get<Member>('members', id);
      if (!member) return { ok: false, reason: 'Member not found' };
      if (member.status === 'ARCHIVED') return { ok: false, reason: 'Already archived' };
      return { ok: true };
    },
    canRestore: async (id) => {
      const member = await db.get<Member>('members', id);
      if (!member || member.status !== 'ARCHIVED') return { ok: false, reason: 'Member not archived' };
      return { ok: true };
    },
  });
  
  // Account
  archiveRegistry.register('Account', {
    canArchive: async (id) => {
      const account = await db.get<Account>('accounts', id);
      if (!account) return { ok: false, reason: 'Account not found' };
      if (account.status === 'ARCHIVED') return { ok: false, reason: 'Already archived' };
      const balance = await getAccountBalance(id);
      if (balance !== 0) return { ok: false, reason: 'Cannot archive account with non-zero balance' };
      return { ok: true };
    },
    canRestore: async (id) => {
      const account = await db.get<Account>('accounts', id);
      if (!account || account.status !== 'ARCHIVED') return { ok: false, reason: 'Account not archived' };
      return { ok: true };
    },
  });
  
  // Event
  archiveRegistry.register('Event', {
    canArchive: async (id) => {
      const event = await db.get<Event>('events', id);
      if (!event) return { ok: false, reason: 'Event not found' };
      if (event.status === 'CANCELLED') return { ok: false, reason: 'Already archived' };
      return { ok: true };
    },
    canRestore: async (id) => {
      const event = await db.get<Event>('events', id);
      if (!event || event.status !== 'CANCELLED') return { ok: false, reason: 'Event not archived' };
      return { ok: true };
    },
  });
}
```

### Intégration UI

```typescript
// src/pages/Archives.tsx — utiliser archiveRegistry
import { archiveRegistry } from '@/lib/archiveService';

const handleRestore = async (type: ArchivableEntity, id: string) => {
  await archiveRegistry.restore(type, id, '', 'local-user');
  navigate(-1);
};
```

---

## Feature 7 : Formulaires — Page Builder

### Schéma SQL
La table `form_definitions` existe déjà — pas de migration.

### Interface TypeScript

```typescript
// Déjà défini dans src/types/index.ts
interface FormDefinition {
  id: string;
  orgId: string;
  key: string;
  name: string;
  description?: string;
  version: number;
  targetEntityType?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fields: FormFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}
```

### Use Cases

```typescript
// src/lib/formSystem.ts — compléter
export const formDefinitionRepo = {
  // ... existing methods ...
  
  async publish(id: string, publishedBy: string): Promise<FormDefinition> {
    const existing = await this.get(id);
    if (!existing) throw new Error('Form not found');
    const updated = { ...existing, status: 'PUBLISHED' as const, updatedAt: new Date().toISOString() };
    await db.put('form_definitions', updated);
    await writeAudit({
      orgId: existing.orgId, transactionId: null, userId: publishedBy,
      actorRoleAtTime: null, action: 'SUBMIT', entityType: 'FormDefinition',
      entityId: id, beforeState: existing, afterState: updated, comment: null
    });
    return updated;
  },
  
  async archive(id: string, archivedBy: string): Promise<FormDefinition> {
    const existing = await this.get(id);
    if (!existing) throw new Error('Form not found');
    const updated = { ...existing, status: 'ARCHIVED' as const, updatedAt: new Date().toISOString() };
    await db.put('form_definitions', updated);
    return updated;
  },
};
```

### UI Composants

```tsx
// src/pages/FormBuilder.tsx
export default function FormBuilder() {
  const { user } = useLocalStore();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedForm, setSelectedForm] = useState<FormDefinition | null>(null);
  
  // CRUD complet pour FormDefinition
  // Builder de champs avec drag & drop
}
```

---

## Feature 8 : Custom Fields — Page Gestion

### Schéma SQL
Les tables `custom_field_definitions` et `custom_field_values` existent — pas de migration.

### Use Cases

```typescript
// src/lib/customFields.ts — compléter
export const customFieldRepo = {
  // ... existing methods ...
  
  async deleteWithValues(id: string): Promise<void> {
    // Supprimer les values associées
    const values = await customFieldValueRepo.getByEntityById(id);
    for (const v of values) {
      await customFieldValueRepo.delete(v.id);
    }
    await this.delete(id);
  },
};
```

---

## Feature 9 : Reporting Builder

### Schéma SQL
La table `report_definitions` existe — pas de migration.

### Use Cases

```typescript
// src/lib/reporting.ts — compléter
export class ReportBuilder {
  async create(def: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportDefinition> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: ReportDefinition = { ...def, id, createdAt: now, updatedAt: now };
    await db.put('report_definitions', entry);
    return entry;
  }
  
  async execute(id: string): Promise<ReportResult> {
    const def = await this.get(id);
    if (!def) throw new Error('Report not found');
    return reportEngine.execute(def);
  }
}
```

---

## Feature 10 : GroupMembership UI

### Schéma SQL
La table `group_memberships` existe — pas de migration.

### Use Cases

```typescript
// src/store/useLocalStore.ts — méthodes existantes
async addMemberToGroup(membership: Omit<GroupMembership, 'id' | 'createdAt'>): Promise<void>
async removeMemberFromGroup(id: string): Promise<void>
```

### UI Composants

```tsx
// src/pages/GroupMembers.tsx
export default function GroupMembers() {
  const { id } = useParams();
  const { memberships, members, addMemberToGroup, removeMemberFromGroup } = useLocalStore();
  // List all members, show which groups they belong to
  // Allow adding/removing members from this group
}
```

---

## Feature 11 : Account UI

### Schéma SQL
La table `accounts` existe — pas de migration.

### UI Composants

```tsx
// src/pages/Accounts.tsx
export default function Accounts() {
  const { accounts } = useLocalStore();
  // List all accounts with balances
  // Show account details
}
```
