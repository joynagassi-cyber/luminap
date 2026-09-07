# Legacy Adapters — Adapters pour Code Existante

> Date : 2026-09-07
> Objet : Adapters nécessaires pour préserver le code existant pendant la migration

---

## 1. Philosophie

Les adapters permettent de :
1. **Isoler** le code legacy derrière une interface propre
2. **Conserver** le fonctionnement actuel sans rupture
3. **Permettre** un remplacement progressif

Un adapter ne doit pas introduire de nouvelles responsabilités — il ne fait que traduire.

---

## 2. Adapters à Créer

### 2.1 CaisseAdapter → Account (Resource Seam)

**Problème** : L'UI utilise `caisses` mais le canonique est `accounts`.

```typescript
// src/adapters/CaisseAdapter.ts
import type { Caisse } from '@/types';
import type { Account } from '@/types';

/**
 * Adapter Caisse → Account
 * Lit depuis accounts mais expose l'interface Caisse pour l'UI existante
 */
export class CaisseAdapter {
  static fromAccount(account: Account): Caisse {
    return {
      id: account.id,
      name: account.name,
      description: '',
      type: account.ownerType === 'ORGANIZATION' ? 'MAIN' : 'GROUP',
      color: '#FF6B00', // défaut, à améliorer
      orgId: account.orgId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      archivedAt: account.archivedAt,
      archivedBy: account.archivedBy,
      archiveReason: account.archiveReason,
      status: account.status,
    };
  }

  static toAccount(caisse: Caisse): Account {
    return {
      id: caisse.id,
      orgId: caisse.orgId,
      ownerType: caisse.type === 'MAIN' ? 'ORGANIZATION' : 'GROUP',
      ownerId: caisse.id,
      name: caisse.name,
      currency: 'XOF',
      status: caisse.status,
      archivedAt: caisse.archivedAt,
      archivedBy: caisse.archivedBy,
      archiveReason: caisse.archiveReason,
      createdAt: caisse.createdAt,
      updatedAt: caisse.updatedAt,
    };
  }

  /**
   * Convertir une liste d'accounts en caisses pour l'UI existante
   */
  static mapAccountsToCaisses(accounts: Account[]): Caisse[] {
    return accounts.map(this.fromAccount);
  }

  /**
   * Fusion caisses legacy + accounts canoniques
   * Priorité: caisses > accounts (pour backward compat)
   */
  static merge(caisses: Caisse[], accounts: Account[]): Caisse[] {
    const map = new Map<string, Caisse>();
    caisses.forEach(c => map.set(c.id, c));
    accounts.forEach(a => {
      if (!map.has(a.id)) {
        map.set(a.id, this.fromAccount(a));
      }
    });
    return Array.from(map.values());
  }
}
```

**Usage** :
```typescript
// Dans useLocalStore.ts ou dataLayer.ts
const caisses = CaisseAdapter.merge(localCaisses, accounts);
```

**Dépendances** : `Account` type, `Caisse` type
**Risque** : Faible — lecture seule
**Supprimable** : Oui, une fois que `getCaisseForDisplay` n'est plus utilisé

---

### 2.2 OrgUnitAdapter → Group (Organization Seam)

**Problème** : L'UI utilise `org_units` mais le canonique est `groups`.

```typescript
// src/adapters/OrgUnitAdapter.ts
import type { OrgUnit } from '@/types';
import type { Group } from '@/types';

/**
 * Adapter OrgUnit → Group
 */
export class OrgUnitAdapter {
  static fromGroup(group: Group): OrgUnit {
    return {
      id: group.id,
      name: group.name,
      type: 'groupe',
      description: '',
      orgId: group.orgId,
      isActive: group.status === 'ACTIVE',
    };
  }

  static toGroup(orgUnit: OrgUnit): Partial<Group> {
    return {
      name: orgUnit.name,
      parentGroupId: null,
      responsableMemberId: null,
      status: orgUnit.isActive ? 'ACTIVE' : 'ARCHIVED',
    };
  }

  static mapOrgUnitsToGroups(orgUnits: OrgUnit[]): Partial<Group>[] {
    return orgUnits.map(this.fromGroup).map(g => ({ ...this.toGroup({
      id: g.id, name: g.name, type: g.type, description: g.description,
      orgId: g.orgId, isActive: g.isActive,
    }) }));
  }
}
```

**Usage** : Même pattern que CaisseAdapter
**Dépendances** : `Group` type, `OrgUnit` type
**Risque** : Faible
**Supprimable** : Oui, lentement

---

### 2.3 TransactionLegacyAdapter → Transaction (Workflow Seam)

**Problème** : Le store expose des transactions avec des champs legacy (`sourceCaisseId`) alors que le canonique utilise `sourceAccountId`.

```typescript
// src/adapters/TransactionLegacyAdapter.ts
import type { Transaction } from '@/types';

/**
 * Adapter pour transactions legacy (sourceCaisseId)
 * Permet la coexistence pendant la migration
 */
export class TransactionLegacyAdapter {
  /**
   * Mapper une transaction PowerSync vers le type Transaction
   * avec fallback sourceCaisseId → sourceAccountId
   */
  static fromPowerSync(psTx: any): Transaction {
    return {
      ...psTx,
      // Mapping legacy → canonique
      sourceCaisseId: psTx.source_caisse_id,
      versementId: psTx.versement_id,
      reversalOfId: psTx.reversal_of_id,
      compensatesFor: psTx.compensates_for,
    } as Transaction;
  }

  /**
   * Déterminer si une transaction est legacy (utilise sourceCaisseId)
   */
  static isLegacy(tx: Transaction): boolean {
    return !!tx.sourceCaisseId && !tx.versementId;
  }

  /**
   * Supprimer les champs legacy avant insertion PowerSync
   */
  static cleanForPowerSync(tx: Transaction): Partial<Transaction> {
    const { sourceCaisseId, ...rest } = tx;
    return rest;
  }
}
```

**Usage** : Dans `dataLayer.ts` pour le mapping PS→TS
**Dépendances** : `Transaction` type
**Risque** : Faible
**Supprimable** : Oui, après migration des données

---

### 2.4 VersementLegacyAdapter → Versement (Workflow Seam)

**Problème** : `Versement.tsx` crée 2 transactions directement au lieu d'utiliser la table `versements`.

```typescript
// src/adapters/VersementLegacyAdapter.ts
import type { Versement } from '@/types';

/**
 * Adapter pour versements legacy (sans table versements)
 * Crée des transactions directement
 */
export class VersementLegacyAdapter {
  /**
   * Adapter les transactions legacy vers un Versement
   */
  static fromTransactions(transactions: any[]): Versement | null {
    if (transactions.length !== 2) return null;
    const versementId = transactions[0].versement_id;
    if (!versementId) return null;

    return {
      id: versementId,
      orgId: transactions[0].org_id,
      fromAccountId: transactions[0].source_caisse_id,
      toAccountId: transactions.find((t: any) => t.type === 'INCOME')?.source_caisse_id,
      amountCents: transactions[0].amount,
      date: transactions[0].date,
      status: 'APPROVED',
      createdBy: transactions[0].created_by_id,
      approvedBy: transactions[0].approved_by_id,
      approvedAt: transactions[0].approved_at,
      createdAt: transactions[0].created_at,
    } as Versement;
  }
}
```

**Usage** : Dans `useVersements()` de `dataLayer.ts` pour dériver les versements
**Dépendances** : `Versement` type
**Risque** : Faible
**Supprimable** : Oui, une fois que `Versement.tsx` utilise la table canonique

---

### 2.5 EventBudgetAdapter → EventBudget + BudgetLine (Activity Seam)

**Problème** : Les budgets sont en JSONB dans `events.budget_items` mais le canonique utilise `event_budgets` + `budget_lines`.

```typescript
// src/adapters/EventBudgetAdapter.ts
import type { EventBudget, BudgetLine } from '@/types';

/**
 * Adapter pour budget événement legacy (jsonb)
 */
export class EventBudgetAdapter {
  /**
   * Parser le budget_items JSONB vers EventBudget + BudgetLine[]
   */
  static fromJsonb(eventId: string, budgetItemsJson: string): { budget: EventBudget; lines: BudgetLine[] } | null {
    if (!budgetItemsJson) return null;

    let items: any[];
    try {
      items = JSON.parse(budgetItemsJson);
    } catch {
      return null;
    }

    const budget: EventBudget = {
      id: `eb-${eventId}`,
      eventId,
      currency: 'XOF',
      revisedAt: null,
      revisedBy: null,
      createdAt: new Date().toISOString(),
    };

    const lines: BudgetLine[] = items.map((item: any) => ({
      id: item.id ?? `bl-${eventId}-${item.label}`,
      eventBudgetId: budget.id,
      categoryId: item.categoryId ?? 'cat-dime',
      plannedAmountCents: item.allocated ?? 0,
      actualAmountCents: item.spent ?? 0,
      createdAt: new Date().toISOString(),
    }));

    return { budget, lines };
  }

  /**
   * Convertir EventBudget + BudgetLine vers budget_items JSONB
   */
  static toJsonb(budget: EventBudget, lines: BudgetLine[]): string {
    const items = lines.map(l => ({
      id: l.id,
      label: l.categoryId,
      allocated: l.plannedAmountCents,
      spent: l.actualAmountCents,
      categoryId: l.categoryId,
      fundedBy: 'main',
    }));
    return JSON.stringify(items);
  }
}
```

**Usage** : Dans `dataLayer.ts` pour le mapping events avec budget
**Dépendances** : `EventBudget`, `BudgetLine` types
**Risque** : Moyen — transformation de données
**Supprimable** : Oui, après migration des données jsonb

---

## 3. Résumé des Adapters

| Adapter | Capability | Interface Legacy | Interface Cible | Risque | Supprimable |
|---------|-----------|-----------------|-----------------|--------|-------------|
| `CaisseAdapter` | Resource | `Caisse` | `Account` | Faible | ✅ |
| `OrgUnitAdapter` | Organization | `OrgUnit` | `Group` | Faible | ✅ |
| `TransactionLegacyAdapter` | Workflow | `Transaction` | `Transaction` | Faible | ✅ |
| `VersementLegacyAdapter` | Workflow | Transactions | `Versement` | Faible | ✅ |
| `EventBudgetAdapter` | Activity | `budget_items` JSONB | `EventBudget` + `BudgetLine` | Moyen | ✅ |

---

## 4. Règles de Conception des Adapters

1. **Un adapter ne modifie jamais le store** — il lit et transforme
2. **Un adapter est pur** — pas de state, pas d'effets de bord
3. **Un adapter est testable isolément** — pas de dépendances externes
4. **Un adapter est temporaire** — chaque adapter doit avoir un plan de suppression
5. **Un adapter ne crée pas de nouvelles abstractions** — il translate uniquement

---

## 5. Ordre de Création des Adapters

| Ordre | Adapter | Dépend | Priorité |
|-------|---------|--------|----------|
| 1 | `CaisseAdapter` | Aucune | Haute — bloquant multi-tenant |
| 2 | `OrgUnitAdapter` | `CaisseAdapter` | Moyenne — duplication org |
| 3 | `TransactionLegacyAdapter` | Aucune | Moyenne — mapping PS→TS |
| 4 | `VersementLegacyAdapter` | `TransactionLegacyAdapter` | Faible — dérivé des transactions |
| 5 | `EventBudgetAdapter` | Aucune | Faible — jsonb parsing |
