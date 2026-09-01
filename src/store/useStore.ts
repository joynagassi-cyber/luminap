import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Transaction,
  Category,
  OrgUnit,
  AuditEntry,
  User,
  Organization,
  BalanceResult,
  TransactionStatus,
} from '@/types';

// Mock data
const mockOrg: Organization = {
  id: 'org-1',
  name: "Église MFE-JC Centrale",
  type: 'Eglise',
  accentColor: '#FF6B00',
};

const mockUser: User = {
  id: 'user-1',
  email: 'admin@mfe-jc.org',
  firstName: 'Pasteur',
  lastName: 'Jean',
  role: 'ADMIN',
  org: mockOrg,
};

const mockCategories: Category[] = [
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

const mockOrgUnits: OrgUnit[] = [
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

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 5000000,
    description: 'Dîme dimanche',
    date: daysAgo(6),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-1',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: mockCategories[0],
    creator: mockUser,
    approver: mockUser,
  },
  {
    id: 'tx-2',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 1500000,
    description: 'Offrande oeuvre sociale',
    date: daysAgo(6),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    categoryId: 'cat-2',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: mockCategories[1],
    creator: mockUser,
    approver: mockUser,
  },
  {
    id: 'tx-3',
    orgId: 'org-1',
    type: 'EXPENSE',
    amount: 250000,
    description: 'Frais électricité église',
    date: daysAgo(8),
    status: 'PENDING',
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: null,
    approvedAt: null,
    categoryId: 'cat-6',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: mockCategories[5],
    creator: mockUser,
  },
  {
    id: 'tx-4',
    orgId: 'org-1',
    type: 'INCOME',
    amount: 750000,
    description: 'Offrande mission',
    date: daysAgo(3),
    status: 'DRAFT',
    createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: null,
    approvedAt: null,
    categoryId: 'cat-3',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: mockCategories[2],
    creator: mockUser,
  },
  {
    id: 'tx-5',
    orgId: 'org-1',
    type: 'EXPENSE',
    amount: 100000,
    description: 'Aumône aux nécessiteux',
    date: daysAgo(10),
    status: 'APPROVED',
    createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
    updatedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    createdById: 'user-1',
    approvedById: 'user-1',
    approvedAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
    categoryId: 'cat-9',
    orgUnitId: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    category: mockCategories[8],
    creator: mockUser,
    approver: mockUser,
  },
];

const mockAuditEntries: AuditEntry[] = [
  {
    id: 'audit-1',
    orgId: 'org-1',
    transactionId: 'tx-1',
    userId: 'user-1',
    action: 'CREATED',
    entityType: 'transaction',
    entityId: 'tx-1',
    comment: null,
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
    user: mockUser,
  },
  {
    id: 'audit-2',
    orgId: 'org-1',
    transactionId: 'tx-1',
    userId: 'user-1',
    action: 'APPROVED',
    entityType: 'transaction',
    entityId: 'tx-1',
    comment: null,
    createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
    user: mockUser,
  },
  {
    id: 'audit-3',
    orgId: 'org-1',
    transactionId: 'tx-3',
    userId: 'user-1',
    action: 'CREATED',
    entityType: 'transaction',
    entityId: 'tx-3',
    comment: null,
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    user: mockUser,
  },
];

export function getBalance(startDate: string, endDate: string): BalanceResult {
  const filtered = mockTransactions.filter(t => t.date >= startDate && t.date <= endDate);
  const totalIncome = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, { income: number; expense: number }>();
  for (const t of filtered) {
    const existing = byCategory.get(t.categoryId) || { income: 0, expense: 0 };
    if (t.type === 'INCOME') existing.income += t.amount;
    else existing.expense += t.amount;
    byCategory.set(t.categoryId, existing);
  }

  const byOrgUnit = new Map<string, { income: number; expense: number }>();
  for (const t of filtered) {
    if (t.orgUnitId) {
      const existing = byOrgUnit.get(t.orgUnitId) || { income: 0, expense: 0 };
      if (t.type === 'INCOME') existing.income += t.amount;
      else existing.expense += t.amount;
      byOrgUnit.set(t.orgUnitId, existing);
    }
  }

  return {
    totalIncome,
    totalExpense,
    netResult: totalIncome - totalExpense,
    byCategory: Array.from(byCategory.entries()).map(([id, v]) => ({
      categoryId: id,
      ...v,
      category: mockCategories.find(c => c.id === id),
    })),
    byOrgUnit: Array.from(byOrgUnit.entries()).map(([id, v]) => ({
      orgUnitId: id,
      ...v,
      orgUnit: mockOrgUnits.find(o => o.id === id),
    })),
    transactionCount: filtered.length,
  };
}

interface LuminaState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Data
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdById' | 'approvedById' | 'approvedAt' | 'compensatesFor' | 'comment'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  approveTransaction: (id: string, approverId: string) => void;
  rejectTransaction: (id: string, comment: string) => void;
  deleteTransaction: (id: string) => void;
}

export const useStore = create<LuminaState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      transactions: mockTransactions,
      categories: mockCategories,
      orgUnits: mockOrgUnits,
      auditEntries: mockAuditEntries,

      login: (email: string, _password: string) => {
        if (email && _password) {
          set({ isAuthenticated: true, user: mockUser });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, user: null });
      },

      addTransaction: (tx) => {
        const newTx: Transaction = {
          ...tx,
          id: `tx-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          createdById: 'user-1',
          approvedById: null,
          approvedAt: null,
          compensatesFor: null,
          comment: null,
          category: mockCategories.find(c => c.id === tx.categoryId),
        };
        set((s) => ({ transactions: [newTx, ...s.transactions] }));
      },

      updateTransaction: (id, updates) => {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      approveTransaction: (id, approverId) => {
        const now = new Date().toISOString();
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id
              ? { ...t, status: 'APPROVED' as const, approvedById: approverId, approvedAt: now, updatedAt: now, version: t.version + 1 }
              : t
          ),
        }));
      },

      rejectTransaction: (id, comment) => {
        const now = new Date().toISOString();
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id
              ? { ...t, status: 'REJECTED' as const, comment, updatedAt: now }
              : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
      },
    }),
    { name: 'lumina-store' }
  )
);
