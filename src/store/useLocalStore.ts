/**
 * Local-first store for Lumina
 * Data persists in IndexedDB, syncs to Supabase in background
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import * as db from '@/lib/db';
import { fetchFromCloud, startBackgroundSync, syncNotifications, syncRoleAssignments, startRealtimeSubscriptions, stopRealtimeSubscriptions } from '@/lib/sync';
import type { Transaction, Category, OrgUnit, AuditEntry, NotificationItem, Role } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────

const ORG = { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise' as const, accentColor: '#FF6B00' };

// ─── Types ─────────────────────────────────────────────────────────────

interface AppState {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    org: typeof ORG;
  };
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  notifications: NotificationItem[];
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
  addCategory: (cat: { key: string; labelFr: string; type: 'INCOME' | 'EXPENSE' }) => Promise<void>;
  updateCategory: (id: string, updates: { key?: string; labelFr?: string; type?: 'INCOME' | 'EXPENSE' }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  syncAll: () => Promise<void>;
  setSyncStatus: (status: AppState['syncStatus']) => void;
  selectRole: (role: Role) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  getUnreadCount: () => number;
}

// ─── Helpers ───────────────────────────────────────────────────────────

async function getUserSessionId(): Promise<string> {
  const id = await db.getConfig<string>('sessionId');
  return id ?? `session-${Date.now()}`;
}

// ─── Store ─────────────────────────────────────────────────────────────

export const useLocalStore = create<AppState & StoreActions>((set, get) => ({
  user: {
    id: '',
    email: '',
    firstName: 'Utilisateur',
    lastName: '',
    role: 'TREASURIER' as Role,
    org: ORG,
  },
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  notifications: [],
  isLoading: true,
  error: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  isOnline: navigator.onLine,

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  getUnreadCount: () => get().notifications.filter(n => !n.isRead).length,

  refreshData: async () => {
    set({ isLoading: true, error: null, syncStatus: 'syncing' });

    try {
      let transactions: Transaction[] = [];
      let categories: Category[] = [];
      let orgUnits: OrgUnit[] = [];
      let auditEntries: AuditEntry[] = [];
      let notifications: NotificationItem[] = [];

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

      // Always merge with local data
      const localTxs = await db.getAllTransactions();
      const localCats = await db.getAllCategories();
      const localOus = await db.getAllOrgUnits();
      const localAudit = await db.getAllAuditEntries();
      const localNotifs = await db.getAllNotifications();

      const finalTxs = transactions.length > 0 ? transactions : localTxs.map(toLocalTx);
      const finalCats = categories.length > 0 ? categories : localCats.map(toLocalCat);
      const finalOus = orgUnits.length > 0 ? orgUnits : localOus.map(toLocalOu);
      const finalAudit = auditEntries.length > 0 ? auditEntries : localAudit.map(toLocalAudit);
      notifications = localNotifs.map(toLocalNotif);

      // Sync role assignments
      await syncRoleAssignments();

      // Update lastSyncedAt
      const now = new Date().toISOString();
      await db.setConfig('lastSyncedAt', now);

      // Restore user role from config
      const savedRole = await db.getConfig<Role>('selectedRole');
      const sessionId = await getUserSessionId();
      const savedRoleAssignment = await db.getRoleAssignment(sessionId);

      set({
        user: {
          id: sessionId,
          email: '',
          firstName: savedRoleAssignment?.role ? getRoleLabel(savedRoleAssignment.role) : 'Utilisateur',
          lastName: '',
          role: savedRole ?? savedRoleAssignment?.role ?? 'TREASURIER',
          org: ORG,
        },
        transactions: finalTxs,
        categories: finalCats,
        orgUnits: finalOus,
        auditEntries: finalAudit,
        notifications,
        isLoading: false,
        syncStatus: navigator.onLine ? 'idle' : 'offline',
        lastSyncedAt: now,
      });
    } catch (err) {
      set({ error: String(err), isLoading: false, syncStatus: 'error' });
    }
  },

  syncAll: async () => {
    set({ syncStatus: 'syncing' });
    await get().refreshData();
    startBackgroundSync();
  },

  addTransaction: async (tx) => {
    const id = `tx-${Date.now()}`;
    const now = new Date().toISOString();
    const user = get().user;

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
      createdById: user.id,
      approvedById: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(localTx);
    await db.enqueueSync('insert', 'transactions', localTx);

    // Also insert notification locally
    const notif: db.IndexedNotification = {
      id: `notif-${Date.now()}`,
      orgId: 'org-1',
      actionType: tx.status === 'PENDING' ? 'TRANSACTION_SUBMITTED' : 'TRANSACTION_DRAFT',
      title: tx.status === 'PENDING' ? 'Nouvelle transaction soumise' : 'Brouillon créé',
      message: `${tx.description} – ${Math.round(tx.amount / 100).toLocaleString('fr-FR')} FCFA`,
      isRead: false,
      sourceTransactionId: id,
      createdAt: now,
    };
    await db.putNotification(notif);

    set(s => ({
      transactions: [toLocalTx(localTx), ...s.transactions],
      notifications: [toLocalNotif(notif), ...s.notifications],
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
      approvedById: userId ?? get().user.id,
      approvedAt: now,
      updatedAt: now,
      version: localTx.version + 1,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(updatedTx);
    await db.enqueueSync('update', 'transactions', updatedTx);

    const notif: db.IndexedNotification = {
      id: `notif-${Date.now()}`,
      orgId: 'org-1',
      actionType: 'TRANSACTION_APPROVED',
      title: 'Transaction approuvée',
      message: `"${updatedTx.description}" a été approuvée`,
      isRead: false,
      sourceTransactionId: id,
      createdAt: now,
    };
    await db.putNotification(notif);

    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? toLocalTx(updatedTx) : t),
      notifications: [toLocalNotif(notif), ...s.notifications],
      error: null,
      syncStatus: 'syncing',
    }));
  },

  rejectTransaction: async (id, comment) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    const now = new Date().toISOString();
    const updatedTx = {
      ...localTx,
      status: 'REJECTED' as const,
      comment,
      updatedAt: now,
      version: localTx.version + 1,
      syncStatus: 'pending' as const,
    };

    await db.putTransaction(updatedTx);
    await db.enqueueSync('update', 'transactions', updatedTx);

    const notif: db.IndexedNotification = {
      id: `notif-${Date.now()}`,
      orgId: 'org-1',
      actionType: 'TRANSACTION_REJECTED',
      title: 'Transaction rejetée',
      message: `"${updatedTx.description}" a été rejetée`,
      isRead: false,
      sourceTransactionId: id,
      createdAt: now,
    };
    await db.putNotification(notif);

    set(s => ({
      transactions: s.transactions.map(t => t.id === id ? toLocalTx(updatedTx) : t),
      notifications: [toLocalNotif(notif), ...s.notifications],
      error: null,
      syncStatus: 'syncing',
    }));
  },

  deleteTransaction: async (id) => {
    const localTx = await db.getTransaction(id);
    if (!localTx) return;

    await db.deleteTransaction(id);
    await db.enqueueSync('delete', 'transactions', { id });

    const notif: db.IndexedNotification = {
      id: `notif-${Date.now()}`,
      orgId: 'org-1',
      actionType: 'TRANSACTION_DELETED',
      title: 'Transaction supprimée',
      message: `"${localTx.description}" a été supprimée`,
      isRead: false,
      sourceTransactionId: id,
      createdAt: new Date().toISOString(),
    };
    await db.putNotification(notif);

    set(s => ({
      transactions: s.transactions.filter(t => t.id !== id),
      notifications: [toLocalNotif(notif), ...s.notifications],
      error: null,
      syncStatus: 'syncing',
    }));
  },

  addCategory: async (cat) => {
    const id = `cat-${Date.now()}`;
    const now = new Date().toISOString();
    const localCat = {
      id,
      key: cat.key,
      labelFr: cat.labelFr,
      type: cat.type,
      orgId: 'org-1',
      syncStatus: 'pending' as const,
      isCustom: true,
    };

    await db.putCategory(localCat);
    await db.enqueueSync('insert', 'categories', localCat);

    set(s => ({
      categories: [...s.categories, toLocalCat(localCat)],
      error: null,
      syncStatus: 'syncing',
    }));
  },

  updateCategory: async (id, updates) => {
    const localCat = await db.getAllCategories();
    const found = localCat.find(c => c.id === id);
    if (!found) return;

    const updatedCat = { ...found, ...updates, syncStatus: 'pending' as const };
    await db.putCategory(updatedCat);
    await db.enqueueSync('update', 'categories', updatedCat);

    set(s => ({
      categories: s.categories.map(c => c.id === id ? toLocalCat(updatedCat) : c),
      error: null,
      syncStatus: 'syncing',
    }));
  },

  deleteCategory: async (id) => {
    await db.deleteCategory(id);
    await db.enqueueSync('delete', 'categories', { id });

    set(s => ({
      categories: s.categories.filter(c => c.id !== id),
      error: null,
      syncStatus: 'syncing',
    }));
  },

  selectRole: async (role: Role) => {
    await db.setRole(role);
    const sessionId = await getUserSessionId();
    await db.putRoleAssignment({ sessionId, role, orgId: 'org-1', createdAt: new Date().toISOString() });

    // Sync role to cloud
    if (navigator.onLine) {
      try {
        await supabase.from('role_assignments').upsert({
          session_id: sessionId,
          role,
          org_id: 'org-1',
        });
      } catch (e) {
        console.warn('[store] role sync to cloud failed', e);
      }
    }

    set(s => ({
      user: { ...s.user, role },
    }));
  },

  markNotificationRead: async (id) => {
    await db.markNotificationRead(id);
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    }));
  },

  markAllNotificationsRead: async () => {
    await db.markAllNotificationsRead();
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    }));
  },
}));

// ─── Mappers ───────────────────────────────────────────────────────────

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
  return { id: cat.id, key: cat.key, labelFr: cat.labelFr, type: cat.type, orgId: cat.orgId, isCustom: cat.isCustom };
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

function toLocalNotif(n: db.IndexedNotification): NotificationItem {
  return {
    id: n.id,
    orgId: n.orgId,
    actionType: n.actionType,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    sourceTransactionId: n.sourceTransactionId,
    createdAt: n.createdAt,
  };
}

// ─── Role label helper ─────────────────────────────────────────────────

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    PASTEUR: 'Pasteur',
    SECRETAIRE: 'Secrétaire',
    TREASURIER: 'Trésorier',
    COMPTABLE: 'Comptable',
    TREASURIER_ADJOINT: 'Trésorier Adjoint',
    SECRETAIRE_ADJOINT: 'Secrétaire Adjoint',
  };
  return labels[role] ?? role;
}

// ─── Init ──────────────────────────────────────────────────────────────

function getState(): AppState & StoreActions {
  return useLocalStore.getState();
}

export function initStore(): void {
  // Start background sync
  startBackgroundSync();

  // Start realtime subscriptions
  startRealtimeSubscriptions();

  // Listen for realtime notifications from window events
  const handleNewNotif = () => {
    getState().refreshData();
  };
  window.addEventListener('lumina:notification', handleNewNotif);
  window.addEventListener('lumina:roles-changed', handleNewNotif);

  // Listen for online/offline
  window.addEventListener('online', () => {
    useLocalStore.setState({ isOnline: true, syncStatus: 'syncing' });
    getState().refreshData();
  });
  window.addEventListener('offline', () => {
    useLocalStore.setState({ isOnline: false, syncStatus: 'offline' });
  });

  // Initial load
  getState().refreshData();
}

// ─── Authorization (read-only, no enforcement) ────────────────────────

export function canActOnTransaction(
  transaction: Transaction | undefined,
  action: 'approve' | 'reject' | 'edit' | 'delete',
  currentUser: ReturnType<typeof useLocalStore.getState>['user'] | null,
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
