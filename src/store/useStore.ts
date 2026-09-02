import { create } from 'zustand';
import type { Transaction, Category, OrgUnit, AuditEntry, User } from '@/types';

const ORG = { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise' as const, accentColor: '#FF6B00' };

const ADMIN: User = {
  id: 'user-1',
  email: 'admin@mfe-jc.org',
  firstName: 'Pasteur',
  lastName: 'Jean',
  role: 'ADMIN',
  org: ORG,
};

const CATEGORIES: Category[] = [
  { id: 'cat-1', key: 'dime', labelFr: 'Dîme', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-2', key: 'offrande', labelFr: 'Offrande', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-3', key: 'offrande_mission', labelFr: 'Offrande Mission', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-4', key: 'don', labelFr: 'Don', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-5', key: 'salaire_pasteur', labelFr: 'Salaire Pasteur', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-6', key: 'frais_fonctionnement', labelFr: 'Frais de Fonctionnement', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-7', key: 'mission', labelFr: 'Mission', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-8', key: 'entretien', labelFr: 'Entretien', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-9', key: 'aumone', labelFr: 'Aumône', type: 'EXPENSE', orgId: 'org-1' },
];

const ORG_UNITS: OrgUnit[] = [
  { id: 'ou-1', name: 'Diacres', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-2', name: 'Jeunesse', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-3', name: 'Dames', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-4', name: 'Messieurs', type: 'groupe', orgId: 'org-1' },
  { id: 'ou-5', name: 'Chorale', type: 'groupe', orgId: 'org-1' },
];

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1', orgId: 'org-1', type: 'INCOME', amount: 5000000, description: 'Dîme dimanche', date: daysAgo(6),
    status: 'APPROVED', createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(), createdById: 'user-1',
    approvedById: 'user-1', approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-1', orgUnitId: null, compensatesFor: null, comment: null, version: 1,
    category: CATEGORIES[0], creator: ADMIN, approver: ADMIN,
  },
  {
    id: 'tx-2', orgId: 'org-1', type: 'INCOME', amount: 1500000, description: 'Offrande oeuvre sociale', date: daysAgo(6),
    status: 'APPROVED', createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(), createdById: 'user-1',
    approvedById: 'user-1', approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-2', orgUnitId: null, compensatesFor: null, comment: null, version: 1,
    category: CATEGORIES[1], creator: ADMIN, approver: ADMIN,
  },
  {
    id: 'tx-3', orgId: 'org-1', type: 'EXPENSE', amount: 250000, description: 'Frais électricité église', date: daysAgo(8),
    status: 'PENDING', createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString(), createdById: 'user-1',
    approvedById: null, approvedAt: null, categoryId: 'cat-6', orgUnitId: null,
    compensatesFor: null, comment: null, version: 1, category: CATEGORIES[5], creator: ADMIN,
  },
  {
    id: 'tx-4', orgId: 'org-1', type: 'INCOME', amount: 750000, description: 'Offrande mission', date: daysAgo(3),
    status: 'DRAFT', createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString(), createdById: 'user-1',
    approvedById: null, approvedAt: null, categoryId: 'cat-3', orgUnitId: null,
    compensatesFor: null, comment: null, version: 1, category: CATEGORIES[2], creator: ADMIN,
  },
  {
    id: 'tx-5', orgId: 'org-1', type: 'EXPENSE', amount: 100000, description: 'Aumône aux nécessiteux', date: daysAgo(10),
    status: 'APPROVED', createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 9 * 86400000).toISOString(), createdById: 'user-1',
    approvedById: 'user-1', approvedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    categoryId: 'cat-9', orgUnitId: null, compensatesFor: null, comment: null, version: 1,
    category: CATEGORIES[8], creator: ADMIN, approver: ADMIN,
  },
];

const AUDIT_ENTRIES: AuditEntry[] = [
  { id: 'audit-1', orgId: 'org-1', transactionId: 'tx-1', userId: 'user-1', action: 'CREATED', entityType: 'transaction', entityId: 'tx-1', comment: null, createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(), user: ADMIN },
  { id: 'audit-2', orgId: 'org-1', transactionId: 'tx-1', userId: 'user-1', action: 'APPROVED', entityType: 'transaction', entityId: 'tx-1', comment: null, createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(), user: ADMIN },
  { id: 'audit-3', orgId: 'org-1', transactionId: 'tx-3', userId: 'user-1', action: 'CREATED', entityType: 'transaction', entityId: 'tx-3', comment: null, createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(), user: ADMIN },
];

interface AppState {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  addTransaction: (tx: { type: string; amount: number; description: string; date: string; categoryId: string; orgUnitId?: string; status: string }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  approveTransaction: (id: string) => void;
  rejectTransaction: (id: string, comment: string) => void;
  deleteTransaction: (id: string) => void;
  refreshData: () => void;
}

export const useStore = create<AppState & StoreActions>((set) => ({
  user: ADMIN,
  transactions: TRANSACTIONS,
  categories: CATEGORIES,
  orgUnits: ORG_UNITS,
  auditEntries: AUDIT_ENTRIES,
  isLoading: false,
  error: null,

  addTransaction: (tx) => {
    const id = `tx-${Date.now()}`;
    const now = new Date().toISOString();
    const newTx: Transaction = {
      id, orgId: 'org-1', type: tx.type as 'INCOME' | 'EXPENSE', amount: Math.round(tx.amount),
      description: tx.description, date: tx.date, status: tx.status as any,
      createdAt: now, updatedAt: now, createdById: 'user-1', approvedById: null, approvedAt: null,
      categoryId: tx.categoryId, orgUnitId: tx.orgUnitId || null, compensatesFor: null, comment: null, version: 1,
      category: CATEGORIES.find(c => c.id === tx.categoryId),
      creator: ADMIN,
    };
    set(s => ({ transactions: [newTx, ...s.transactions], error: null }));
  },

  updateTransaction: (id, updates) => {
    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString(), version: (t.version || 0) + 1 } : t),
      error: null,
    }));
  },

  approveTransaction: (id) => {
    const now = new Date().toISOString();
    set(s => ({
      transactions: s.transactions.map(t => t.id === id
        ? { ...t, status: 'APPROVED' as const, approvedById: 'user-1', approvedAt: now, updatedAt: now }
        : t
      ),
      error: null,
    }));
  },

  rejectTransaction: (id, comment) => {
    set(s => ({
      transactions: s.transactions.map(t => t.id === id
        ? { ...t, status: 'REJECTED' as const, comment, updatedAt: new Date().toISOString() }
        : t
      ),
      error: null,
    }));
  },

  deleteTransaction: (id) => {
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id), error: null }));
  },

  refreshData: () => set({ isLoading: false, error: null }),
}));

export function canActOnTransaction(
  transaction: Transaction | undefined,
  action: 'approve' | 'reject' | 'edit' | 'delete',
  currentUser: User | null,
): boolean {
  if (!transaction || !currentUser) return false;
  switch (action) {
    case 'edit': return transaction.status === 'DRAFT' || transaction.status === 'REJECTED';
    case 'delete': return transaction.status === 'REJECTED';
    case 'approve': return transaction.status === 'PENDING' && currentUser.role !== 'TREASURER';
    case 'reject': return transaction.status === 'PENDING' && currentUser.role !== 'TREASURER';
    default: return false;
  }
}
