import { create } from 'zustand';
import type {
  Transaction,
  Category,
  OrgUnit,
  AuditEntry,
  BalanceResult,
  User,
  TransactionStatus,
} from '@/types';
import {
  MOCK_ORG,
  MOCK_USER,
  MOCK_CATEGORIES,
  MOCK_ORG_UNITS,
  MOCK_TRANSACTIONS,
  MOCK_AUDIT_ENTRIES,
  MOCK_CREDENTIALS,
} from '@/config/mockData';
import { api, getSessionToken, setSessionToken, clearSession } from '@/lib/api';

export function getBalance(startDate: string, endDate: string): BalanceResult {
  const filtered = MOCK_TRANSACTIONS.filter(t => t.date >= startDate && t.date <= endDate);
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
      category: MOCK_CATEGORIES.find(c => c.id === id),
    })),
    byOrgUnit: Array.from(byOrgUnit.entries()).map(([id, v]) => ({
      orgUnitId: id,
      ...v,
      orgUnit: MOCK_ORG_UNITS.find(o => o.id === id),
    })),
    transactionCount: filtered.length,
  };
}

interface LuminaState {
  isAuthenticated: boolean;
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'createdById' | 'approvedById' | 'approvedAt' | 'compensatesFor' | 'comment'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  approveTransaction: (id: string, approverId: string) => void;
  rejectTransaction: (id: string, comment: string) => void;
  deleteTransaction: (id: string) => void;
}

export function canActOnTransaction(
  transaction: Transaction | undefined,
  action: 'approve' | 'reject' | 'edit' | 'delete',
  currentUser: User | null,
): boolean {
  if (!transaction || !currentUser) return false;
  if (transaction.orgId !== currentUser.org.id) return false;
  switch (action) {
    case 'edit': return transaction.status === 'DRAFT' || transaction.status === 'REJECTED';
    case 'delete': return transaction.status === 'REJECTED';
    case 'approve': return transaction.status === 'PENDING' && currentUser.role !== 'TREASURER';
    case 'reject': return transaction.status === 'PENDING' && currentUser.role !== 'TREASURER';
    default: return false;
  }
}

export const useStore = create<LuminaState>((set) => ({
  isAuthenticated: getSessionToken() !== null,
  user: getSessionToken() ? MOCK_USER : null,
  transactions: MOCK_TRANSACTIONS,
  categories: MOCK_CATEGORIES,
  orgUnits: MOCK_ORG_UNITS,
  auditEntries: MOCK_AUDIT_ENTRIES,

  login: async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    if (result.ok && result.data?.sessionToken) {
      setSessionToken(result.data.sessionToken);
      set({ isAuthenticated: true, user: MOCK_USER });
      return true;
    }
    // Fallback to mock auth for dev
    const credentials = MOCK_CREDENTIALS.find(c => c.email === email);
    if (credentials && credentials.passwordHash === btoa(password)) {
      set({ isAuthenticated: true, user: MOCK_USER });
      return true;
    }
    return false;
  },

  logout: () => {
    clearSession();
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
      category: MOCK_CATEGORIES.find(c => c.id === tx.categoryId),
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
}));
