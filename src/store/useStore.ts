import { create } from 'zustand';
import type { Transaction, Category, OrgUnit, AuditEntry, User } from '@/types';

interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
}

interface StoreActions {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  addTransaction: (tx: {
    type: string; amount: number; description: string; date: string;
    categoryId: string; orgUnitId?: string; status: string;
  }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string, comment: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

const API_BASE = '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { statusMessage?: string; message?: string }).statusMessage || res.statusText);
  }
  return res.json();
}

export const useStore = create<AppState & StoreActions>((set, get) => ({
  isAuthenticated: false,
  user: null,
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  isLoading: true,
  error: null,

  login: async (email, password) => {
    try {
      const res = await fetchApi<{ ok: boolean; user: User; sessionToken: string }>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok && res.user) {
        set({ isAuthenticated: true, user: res.user, error: null });
        await get().refreshData();
        return true;
      }
      set({ error: 'Identifiants invalides' });
      return false;
    } catch (e) {
      set({ error: (e as Error).message || 'Erreur de connexion' });
      return false;
    }
  },

  signup: async (email, password, firstName, lastName) => {
    try {
      const res = await fetchApi<{ ok: boolean; user: User; sessionToken: string }>(`/auth/signup`, {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      if (res.ok && res.user) {
        set({ isAuthenticated: true, user: res.user, error: null });
        await get().refreshData();
        return true;
      }
      return false;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  logout: async () => {
    await fetchApi('/auth/session', { method: 'DELETE' }).catch(() => {});
    set({ isAuthenticated: false, user: null, transactions: [], categories: [], orgUnits: [], auditEntries: [] });
  },

  refreshData: async () => {
    try {
      const res = await fetchApi<{ ok: boolean; categories: Category[]; orgUnits: OrgUnit[]; transactions: Transaction[]; auditEntries: AuditEntry[] }>(`/data`);
      if (res.ok) {
        set({
          categories: res.categories || [],
          orgUnits: res.orgUnits || [],
          transactions: res.transactions || [],
          auditEntries: res.auditEntries || [],
          error: null,
        });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    try {
      const res = await fetchApi<{ ok: boolean; transaction: Transaction }>(`/transactions`, {
        method: 'POST',
        body: JSON.stringify(tx),
      });
      if (res.ok) {
        set(s => ({ transactions: [res.transaction, ...s.transactions] }));
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      await fetchApi<{ ok: boolean }>(`/transactions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await get().refreshData();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  approveTransaction: async (id) => {
    try {
      const res = await fetchApi<{ ok: boolean; transaction: Transaction }>(`/transactions/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: 'APPROVE' }),
      });
      if (res.ok) {
        set(s => ({
          transactions: s.transactions.map(t => t.id === id ? { ...t, ...res.transaction } : t),
          error: null,
        }));
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  rejectTransaction: async (id, comment) => {
    try {
      const res = await fetchApi<{ ok: boolean; transaction: Transaction }>(`/transactions/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: 'REJECT', comment }),
      });
      if (res.ok) {
        set(s => ({
          transactions: s.transactions.map(t => t.id === id ? { ...t, ...res.transaction } : t),
          error: null,
        }));
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteTransaction: async (id) => {
    try {
      await fetchApi<{ ok: boolean }>(`/transactions/${id}`, { method: 'DELETE' });
      set(s => ({ transactions: s.transactions.filter(t => t.id !== id), error: null }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
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
