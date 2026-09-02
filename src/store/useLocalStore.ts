/**
 * Local-first store for Lumina
 * Data persists in IndexedDB, syncs to Supabase in background
 * No authentication required
 */
import { create } from 'zustand';
import * as db from '@/lib/db';
import { fetchFromCloud, startBackgroundSync } from '@/lib/sync';
import type { Transaction, Category, OrgUnit, AuditEntry } from '@/types';

// ─── Constants ─────────────────────────────────────────────────

const ORG = { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise' as const, accentColor: '#FF6B00' };

// Mock admin for display purposes
const DEFAULT_USER = {
  id: 'local-user',
  email: 'utilisateur@mfe-jc.org',
  firstName: 'Membre',
  lastName: 'MFE-JC',
  role: 'ADMIN' as const,
  org: ORG,
};

// ─── Types ─────────────────────────────────────────────────────

interface AppState {
  user: typeof DEFAULT_USER;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncedAt: string | null;
  isOnline: boolean;
}

interface StoreActions {
  addTransaction: (tx: { type: string; amount: number; description: string; date: string; categoryId: string; orgUnitId?: string; status: string }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  rejectTransaction: (id: string, comment: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

// ─── Store ─────────────────────────────────────────────────────

export const useLocalStore = create<AppState & StoreActions>((set, get) => ({
  user: DEFAULT_USER,
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  isLoading: true,
  error: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  isOnline: navigator.onLine,

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  refreshData: async () => {
    set({ isLoading: true, error: null, syncStatus: 'syncing' });

    try {
      // Try cloud first, fall back to local
      let transactions: Transaction[] = [];
      let categories: Category[] = [];
      let orgUnits: OrgUnit[] = [];
      let auditEntries: AuditEntry[] = [];

      if (navigator.onLine) {
        try {
          const cloudData = await fetchFromCloud();
          transactions = cloudData.transactions.map(toLocalTx);
          categories = cloudData.categories.map(toLocalCat);
          orgUnits = cloudData.orgUnits.map(toLocalOu);
          auditEntries = cloudData.auditEntries.map(toLocalAudit);
        } catch (cloudErr) {
          console.warn('[store] cloud fetch failed, using local data', cloudErr);
        }
      }

      // Always merge with local data (local is source of truth for unsynced changes)
      const localTxs = await db.getAllTransactions();
      const localCats = await db.getAllCategories();
      const localOus = await db.getAllOrgUnits();
      const localAudit = await db.getAllAuditEntries();

      // Prefer cloud data, merge local unsynced changes
      const syncedLocalTxs = localTxs.filter(t => t.syncStatus === 'synced');
      const pendingLocalTxs = localTxs.filter(t => t.syncStatus === 'pending');

      // Use cloud if available, otherwise local
      const finalTxs = transactions.length > 0 ? transactions : localTxs.map(toLocalTx);
      const finalCats = categories.length > 0 ? categories : localCats.map(toLocalCat);
      const finalOus = orgUnits.length > 0 ? orgUnits : localOus.map(toLocalOu);
      const finalAudit = auditEntries.length > 0 ? auditEntries : localAudit.map(toLocalAudit);

      set({
        transactions: finalTxs,
        categories: finalCats,
        orgUnits: finalOus,
        auditEntries: finalAudit,
        isLoading: false,
        syncStatus: navigator.onLine ? 'idle' : 'offline',
        lastSyncedAt: null,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false, syncStatus: 'error' });
    }
  },

  addTransaction: async (tx) => {
    const id = `tx-${Date.now()}`;
    const now = new Date().toISOString();

    const localTx = {
      id,
      orgId: 'org-1',
      type: tx.type as 'INCOME' | 'EXPENSE',
      amount: Math.round(tx.amount),
      description: tx.description,
      date: tx.date,
      status: tx.status as any,
      categoryId: tx.categoryId,
      orgUnitId: tx.orgUnitId ?? null,
      compensatesFor: null,
      comment: null,
      version: 1,
      createdById: DEFAULT_USER.id,
      approvedById: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const,
    };

    // Save to IndexedDB immediately (optimistic)
    await db.putTransaction(localTx);

    // Enqueue for background sync
    await db.enqueueSync('insert', 'transactions', localTx);

    // Update UI immediately
    set(s => ({
      transactions: [toLocalTx(localTx), ...s.transactions],
      error: null,
      syncStatus: 'syncing',
    }));
  },

  updateTransaction: async (id, updates) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    const updatedTx = {
      ...localTx,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: localTx.version + 1,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(updatedTx);
    await db.enqueueSync('update', 'transactions', updatedTx);

    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? toLocalTx(updatedTx) : t),
      error: null,
      syncStatus: 'syncing',
    }));
  },

  approveTransaction: async (id, userId) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    const now = new Date().toISOString();
    const updatedTx = {
      ...localTx,
      status: 'APPROVED' as const,
      approvedById: userId ?? DEFAULT_USER.id,
      approvedAt: now,
      updatedAt: now,
      version: localTx.version + 1,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(updatedTx);
    await db.enqueueSync('update', 'transactions', updatedTx);

    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? toLocalTx(updatedTx) : t),
      error: null,
      syncStatus: 'syncing',
    }));
  },

  rejectTransaction: async (id, comment) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    const updatedTx = {
      ...localTx,
      status: 'REJECTED' as const,
      comment,
      updatedAt: new Date().toISOString(),
      version: localTx.version + 1,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(updatedTx);
    await db.enqueueSync('update', 'transactions', updatedTx);

    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? toLocalTx(updatedTx) : t),
      error: null,
      syncStatus: 'syncing',
    }));
  },

  deleteTransaction: async (id) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    await db.deleteTransaction(id);
    await db.enqueueSync('delete', 'transactions', { id });

    set(s => ({
      transactions: s.transactions.filter(t => t.id !== id),
      error: null,
      syncStatus: 'syncing',
    }));
  },
}));

// ─── Mappers ───────────────────────────────────────────────────

function toLocalTx(tx: any): Transaction {
  return {
    id: tx.id,
    orgId: tx.orgId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    status: tx.status,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    createdById: tx.createdById,
    approvedById: tx.approvedById,
    approvedAt: tx.approvedAt,
    categoryId: tx.categoryId,
    orgUnitId: tx.orgUnitId,
    compensatesFor: tx.compensatesFor,
    comment: tx.comment,
    version: tx.version,
  };
}

function toLocalCat(cat: any): Category {
  return { id: cat.id, key: cat.key, labelFr: cat.labelFr, type: cat.type, orgId: cat.orgId };
}

function toLocalOu(ou: any): OrgUnit {
  return { id: ou.id, name: ou.name, type: ou.type, orgId: ou.orgId };
}

function toLocalAudit(entry: any): AuditEntry {
  return {
    id: entry.id,
    orgId: entry.orgId,
    transactionId: entry.transactionId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    comment: entry.comment,
    createdAt: entry.createdAt,
  };
}

// ─── Authorization ─────────────────────────────────────────────

export function canActOnTransaction(
  transaction: Transaction | undefined,
  action: 'approve' | 'reject' | 'edit' | 'delete',
  currentUser: typeof DEFAULT_USER | null,
): boolean {
  if (!transaction || !currentUser) return false;
  switch (action) {
    case 'edit': return transaction.status === 'DRAFT' || transaction.status === 'REJECTED';
    case 'delete': return transaction.status === 'REJECTED';
    case 'approve': return transaction.status === 'PENDING';
    case 'reject': return transaction.status === 'PENDING';
    default: return false;
  }
}

// ─── Init ──────────────────────────────────────────────────────

export function initStore(): void {
  // Start background sync
  startBackgroundSync();

  // Listen for online/offline
  window.addEventListener('online', () => {
    useLocalStore.setState({ isOnline: true, syncStatus: 'syncing' });
    useLocalStore.getState().refreshData();
  });
  window.addEventListener('offline', () => {
    useLocalStore.setState({ isOnline: false, syncStatus: 'offline' });
  });

  // Initial load
  useLocalStore.getState().refreshData();
}
