import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import { enqueueSync } from '@/lib/sync';
import type { User, Role, Transaction, Category, OrgUnit, Caisse, Event, BudgetItem, ShoppingItem, AppConfig, NotificationItem } from '@/types';
import { generateId } from '@/lib/utils';

interface LocalStoreState {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  events: Event[];
  auditEntries: any[];
  notifications: NotificationItem[];
  appConfig: AppConfig;
  isLoading: boolean;
  isOnline: boolean;
  selectRole: (role: Role) => Promise<void>;
  createNotification: (notif: Omit<NotificationItem, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  batchDeleteTransactions: (ids: string[]) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  batchApproveTransactions: (ids: string[], userId?: string) => Promise<void>;
  syncEventBudget: (eventId: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (id: string, status: Event['status'], userId?: string) => Promise<void>;
  addBudgetItem: (eventId: string, item: Omit<BudgetItem, 'id'>) => Promise<void>;
  removeBudgetItem: (eventId: string, itemId: string) => Promise<void>;
  updateShoppingItemStatus: (eventId: string, itemId: string, status: ShoppingItem['status']) => Promise<void>;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  createGroup: (data: { name: string; type: string; description: string; color: string }) => Promise<void>;
  updateGroup: (id: string, data: Partial<OrgUnit>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  loadInitialData: () => Promise<void>;
  setOnline: (online: boolean) => void;
}

const DEFAULT_USER: User = {
  id: 'local-user',
  email: '',
  firstName: 'Utilisateur',
  lastName: '',
  role: 'TREASURIER',
  org: {
    id: 'org-1',
    name: 'Église MFE-JC Centrale',
    type: 'Eglise',
    accentColor: '#FF6B00',
  },
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-dime', key: 'dime', labelFr: 'Dîme', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-offrande', key: 'offrande', labelFr: 'Offrande', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-offrande-mission', key: 'offrande_mission', labelFr: 'Offrande Mission', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-don', key: 'don', labelFr: 'Don', type: 'INCOME', orgId: 'org-1' },
  { id: 'cat-salaire-pasteur', key: 'salaire_pasteur', labelFr: 'Salaire Pasteur', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-frais-fonc', key: 'frais_fonctionnement', labelFr: 'Frais de Fonctionnement', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-mission', key: 'mission', labelFr: 'Mission', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-entretien', key: 'entretien', labelFr: 'Entretien', type: 'EXPENSE', orgId: 'org-1' },
  { id: 'cat-aumone', key: 'aumone', labelFr: 'Aumône', type: 'EXPENSE', orgId: 'org-1' },
];

const DEFAULT_CAISSES: Caisse[] = [
  { id: 'main', name: 'Caisse principale', description: 'Fonds de l\'église', type: 'MAIN', color: '#FF6B00', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-diactes', name: 'Diacres', description: 'Groupe des diacres', type: 'GROUP', color: '#3B82F6', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-jeunesse', name: 'Jeunesse', description: 'Groupe de jeunesse', type: 'GROUP', color: '#8B5CF6', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-dames', name: 'Dames', description: 'Groupe des dames', type: 'GROUP', color: '#EC4899', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-messieurs', name: 'Messieurs', description: 'Groupe des messieurs', type: 'GROUP', color: '#14B8A6', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-chorale', name: 'Chorale', description: 'Groupe de la chorale', type: 'GROUP', color: '#F59E0B', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const DEFAULT_ORG_UNITS: OrgUnit[] = [
  { id: 'org-diactes', name: 'Diacres', type: 'groupe', description: 'Groupe des diacres', orgId: 'org-1', isActive: true },
  { id: 'org-jeunesse', name: 'Jeunesse', type: 'groupe', description: 'Groupe de jeunesse', orgId: 'org-1', isActive: true },
  { id: 'org-dames', name: 'Dames', type: 'groupe', description: 'Groupe des dames', orgId: 'org-1', isActive: true },
  { id: 'org-messieurs', name: 'Messieurs', type: 'groupe', description: 'Groupe des messieurs', orgId: 'org-1', isActive: true },
  { id: 'org-chorale', name: 'Chorale', type: 'groupe', description: 'Groupe de la chorale', orgId: 'org-1', isActive: true },
];

const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1', '#F97316', '#06B6D4'];

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

export const useLocalStore = create<LocalStoreState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      orgUnits: DEFAULT_ORG_UNITS,
      caisses: DEFAULT_CAISSES,
      events: [],
      auditEntries: [],
      notifications: [],
      appConfig: { churchName: '', churchLogoUrl: '', userPhoto: '' },
      isLoading: false,
      isOnline: navigator.onLine,

      selectRole: async (role) => {
        const sessionId = localStorage.getItem('lumina-session') ?? crypto.randomUUID();
        localStorage.setItem('lumina-session', sessionId);
        localStorage.setItem('lumina-role', role);
        await db.setRole(role);
        await db.putRoleAssignment({ sessionId, role, orgId: 'org-1', createdAt: new Date().toISOString() });
        set({ user: { ...get().user, role } });
      },

      addTransaction: async (tx) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newTx: Transaction = { ...tx, id, createdAt: now, updatedAt: now, version: 1 };
        const updated = [...get().transactions, newTx];
        set({ transactions: updated });
        await db.put('transactions', newTx);
        await enqueueSync({ id: `sync-${id}`, operation: 'create', entityType: 'transactions', entityId: id, payload: newTx, attempts: 0, lastAttempt: null, createdAt: now });
        // Create notification for pending transactions
        if (newTx.status === 'PENDING') {
          const caisse = get().caisses.find(c => c.id === newTx.sourceCaisseId);
          const notifId = generateId();
          const notif = {
            id: notifId,
            orgId: 'org-1',
            actionType: 'TRANSACTION_PENDING',
            title: 'Nouvelle transaction en attente',
            message: `${newTx.description} — ${newTx.amount / 100} FCFA${caisse?.name ? ` (${caisse.name})` : ''}`,
            isRead: false,
            sourceTransactionId: id,
            createdAt: now,
          };
          await db.put('notifications', notif);
          await enqueueSync({ id: `sync-notif-${notifId}`, operation: 'create', entityType: 'notifications', entityId: notifId, payload: notif, attempts: 0, lastAttempt: null, createdAt: now });
        }
      },

      updateTransaction: async (id, data) => {
        const updated = get().transactions.map(t =>
          t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
        );
        set({ transactions: updated });
        const updatedTx = updated.find(t => t.id === id);
        if (updatedTx) {
          await db.put('transactions', updatedTx);
          await enqueueSync({ id: `sync-${id}`, operation: 'update', entityType: 'transactions', entityId: id, payload: updatedTx, attempts: 0, lastAttempt: null, createdAt: new Date().toISOString() });
        }
      },

      deleteTransaction: async (id) => {
        const updated = get().transactions.filter(t => t.id !== id);
        set({ transactions: updated });
        await db.delete('transactions', id);
        await enqueueSync({ id: `sync-${id}`, operation: 'delete', entityType: 'transactions', entityId: id, payload: {}, attempts: 0, lastAttempt: null, createdAt: new Date().toISOString() });
      },

      batchDeleteTransactions: async (ids: string[]) => {
        const updated = get().transactions.filter(t => !ids.includes(t.id));
        set({ transactions: updated });
        for (const id of ids) {
          await db.delete('transactions', id);
          await enqueueSync({ id: `sync-${id}`, operation: 'delete', entityType: 'transactions', entityId: id, payload: {}, attempts: 0, lastAttempt: null, createdAt: new Date().toISOString() });
        }
      },

      approveTransaction: async (id, userId) => {
        const now = new Date().toISOString();
        const updated = get().transactions.map(t =>
          t.id === id ? { ...t, status: 'APPROVED' as const, approvedById: userId ?? get().user.id, approvedAt: now, updatedAt: now, version: t.version + 1 } : t
        );
        set({ transactions: updated });
        const updatedTx = updated.find(t => t.id === id);
        if (updatedTx) {
          await db.put('transactions', updatedTx);
          await enqueueSync({ id: `sync-${id}`, operation: 'update', entityType: 'transactions', entityId: id, payload: updatedTx, attempts: 0, lastAttempt: null, createdAt: now });
          // Sync budget spent for events
          if (updatedTx.eventId) {
            await get().syncEventBudget(updatedTx.eventId);
          }
          // Notify
          const caisse = get().caisses.find(c => c.id === updatedTx.sourceCaisseId);
          const notifId = generateId();
          const notif = {
            id: notifId,
            orgId: 'org-1',
            actionType: 'TRANSACTION_APPROVED',
            title: 'Transaction approuvée',
            message: `${updatedTx.description} — ${updatedTx.amount / 100} FCFA${caisse?.name ? ` (${caisse.name})` : ''} a été approuvée.`,
            isRead: false,
            sourceTransactionId: id,
            createdAt: now,
          };
          await db.put('notifications', notif);
          await enqueueSync({ id: `sync-notif-${notifId}`, operation: 'create', entityType: 'notifications', entityId: notifId, payload: notif, attempts: 0, lastAttempt: null, createdAt: now });
        }
      },

      batchApproveTransactions: async (ids, userId) => {
        const now = new Date().toISOString();
        const updated = get().transactions.map(t =>
          ids.includes(t.id)
            ? { ...t, status: 'APPROVED' as const, approvedById: userId ?? get().user.id, approvedAt: now, updatedAt: now, version: t.version + 1 }
            : t
        );
        set({ transactions: updated });
        for (const txId of ids) {
          const updatedTx = updated.find(t => t.id === txId);
          if (updatedTx) {
            await db.put('transactions', updatedTx);
            await enqueueSync({ id: `sync-${txId}`, operation: 'update', entityType: 'transactions', entityId: txId, payload: updatedTx, attempts: 0, lastAttempt: null, createdAt: now });
            if (updatedTx.eventId) {
              await get().syncEventBudget(updatedTx.eventId);
            }
          }
        }
      },

      syncEventBudget: async (eventId: string) => {
        const events = get().events;
        const txs = get().transactions;
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        const eventTxs = txs.filter(t => t.eventId === eventId && t.status === 'APPROVED');
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};

        for (const tx of eventTxs) {
          if (tx.type === 'INCOME') {
            incomeByCategory[tx.categoryId] = (incomeByCategory[tx.categoryId] || 0) + tx.amount;
          } else {
            expenseByCategory[tx.categoryId] = (expenseByCategory[tx.categoryId] || 0) + tx.amount;
          }
        }

        const updatedBudgetItems = event.budgetItems.map(item => {
          // Match by categoryId or by label containing category
          const categoryIncome = incomeByCategory[item.categoryId || ''] || 0;
          const categoryExpense = expenseByCategory[item.categoryId || ''] || 0;
          const newSpent = Math.round((categoryIncome - categoryExpense) / 100);
          const prevSpent = Math.round(item.spent / 100);
          return { ...item, spent: item.allocated > 0 && newSpent > prevSpent ? newSpent * 100 : item.spent };
        });

        const totalSpent = updatedBudgetItems.reduce((s, i) => s + i.spent, 0);
        const updatedEvent = { ...event, budgetItems: updatedBudgetItems, updatedAt: new Date().toISOString() };
        const updatedEvents = events.map(e => e.id === eventId ? updatedEvent : e);
        set({ events: updatedEvents });
        await db.put('events', updatedEvent);

        // Check for budget exceeded
        for (const item of updatedBudgetItems) {
          if (item.allocated > 0 && item.spent > item.allocated) {
            const now = new Date().toISOString();
            await db.put('notifications', {
              id: generateId(),
              orgId: 'org-1',
              actionType: 'BUDGET_EXCEEDED',
              title: `Budget dépassé: ${event.name}`,
              message: `Le poste "${item.label}" a dépassé son budget (${Math.round(item.spent / 100)} FCFA / ${Math.round(item.allocated / 100)} FCFA)`,
              isRead: false,
              sourceTransactionId: null,
              createdAt: now,
            });
          }
        }
      },

      deleteEvent: async (id) => {
        // Delete all transactions linked to this event
        const linkedTxIds = get().transactions.filter(t => t.eventId === id).map(t => t.id);
        if (linkedTxIds.length > 0) {
          await get().batchDeleteTransactions(linkedTxIds);
        }
        const now = new Date().toISOString();
        const updated = get().events.filter(e => e.id !== id);
        set({ events: updated });
        await db.delete('events', id);
        await enqueueSync({ id: `sync-${id}`, operation: 'delete', entityType: 'events', entityId: id, payload: {}, attempts: 0, lastAttempt: null, createdAt: now });
      },

      updateEventStatus: async (id, status) => {
        const now = new Date().toISOString();
        const updated = get().events.map(e =>
          e.id === id ? { ...e, status, updatedAt: now } : e
        );
        set({ events: updated });
        const updatedEvent = updated.find(e => e.id === id);
        if (updatedEvent) {
          await db.put('events', updatedEvent);
          await enqueueSync({ id: `sync-${id}`, operation: 'update', entityType: 'events', entityId: id, payload: updatedEvent, attempts: 0, lastAttempt: null, createdAt: now });
        }
        // Notify on status change
        if (updatedEvent) {
          const notifId = generateId();
          const notif = {
            id: notifId,
            orgId: 'org-1',
            actionType: 'EVENT_STATUS_CHANGED',
            title: `Événement ${status === 'ONGOING' ? 'démarré' : status === 'COMPLETED' ? 'terminé' : status === 'CANCELLED' ? 'annulé' : 'planifié'}`,
            message: `${updatedEvent.name} — ${status}`,
            isRead: false,
            sourceTransactionId: null,
            createdAt: now,
          };
          await db.put('notifications', notif);
          await enqueueSync({ id: `sync-notif-${notifId}`, operation: 'create', entityType: 'notifications', entityId: notifId, payload: notif, attempts: 0, lastAttempt: null, createdAt: now });
        }
      },

      addEvent: async (event) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newEvent: Event = {
          ...event,
          id,
          createdAt: now,
          updatedAt: now,
          budgetItems: event.budgetItems ?? [],
          shoppingItems: event.shoppingItems ?? [],
        };
        const updated = [...get().events, newEvent];
        set({ events: updated });
        await db.put('events', newEvent);
        await enqueueSync({ id: `sync-${id}`, operation: 'create', entityType: 'events', entityId: id, payload: newEvent, attempts: 0, lastAttempt: null, createdAt: now });
      },

      updateEvent: async (id, data) => {
        const updated = get().events.map(e =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        );
        set({ events: updated });
        const updatedEvent = updated.find(e => e.id === id);
        if (updatedEvent) {
          await db.put('events', updatedEvent);
          await enqueueSync({ id: `sync-${id}`, operation: 'update', entityType: 'events', entityId: id, payload: updatedEvent, attempts: 0, lastAttempt: null, createdAt: new Date().toISOString() });
        }
      },

      addBudgetItem: async (eventId, item) => {
        const event = get().events.find(e => e.id === eventId);
        if (!event) return;
        const newItem: BudgetItem = { id: generateId(), ...item };
        const newItems = [...event.budgetItems, newItem];
        const total = newItems.reduce((s, i) => s + i.allocated, 0);
        await get().updateEvent(eventId, { budgetItems: newItems, budget: total });
      },

      removeBudgetItem: async (eventId, itemId) => {
        const event = get().events.find(e => e.id === eventId);
        if (!event) return;
        const newItems = event.budgetItems.filter(i => i.id !== itemId);
        const total = newItems.reduce((s, i) => s + i.allocated, 0);
        await get().updateEvent(eventId, { budgetItems: newItems, budget: total });
      },

      addShoppingItem: async (eventId, item) => {
        const event = get().events.find(e => e.id === eventId);
        if (!event) return;
        const newItem: ShoppingItem = { id: generateId(), ...item };
        const newItems = [...event.shoppingItems, newItem];
        await get().updateEvent(eventId, { shoppingItems: newItems });
      },

      removeShoppingItem: async (eventId, itemId) => {
        const event = get().events.find(e => e.id === eventId);
        if (!event) return;
        const newItems = event.shoppingItems.filter(i => i.id !== itemId);
        await get().updateEvent(eventId, { shoppingItems: newItems });
      },

      updateShoppingItemStatus: async (eventId, itemId, status) => {
        const event = get().events.find(e => e.id === eventId);
        if (!event) return;
        const newItems = event.shoppingItems.map(i =>
          i.id === itemId ? { ...i, status } : i
        );
        await get().updateEvent(eventId, { shoppingItems: newItems });
      },

      updateConfig: async (config) => {
        const current = get().appConfig;
        const updated = { ...current, ...config };
        set({ appConfig: updated });
        await db.setConfig('appConfig', updated);
      },

      createNotification: async (notif) => {
        const id = generateId();
        const now = new Date().toISOString();
        const newNotif: NotificationItem = { ...notif, id, createdAt: now };
        const updated = [newNotif, ...get().notifications];
        set({ notifications: updated });
        await db.put('notifications', newNotif);
        await enqueueSync({ id: `sync-notif-${id}`, operation: 'create', entityType: 'notifications', entityId: id, payload: newNotif, attempts: 0, lastAttempt: null, createdAt: now });
      },

      markNotificationRead: async (id) => {
        const updated = get().notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        );
        set({ notifications: updated });
        const updatedNotif = updated.find(n => n.id === id);
        if (updatedNotif) {
          await db.put('notifications', updatedNotif);
          await enqueueSync({ id: `sync-notif-${id}`, operation: 'update', entityType: 'notifications', entityId: id, payload: updatedNotif, attempts: 0, lastAttempt: null, createdAt: new Date().toISOString() });
        }
      },

      markAllNotificationsRead: async () => {
        const updated = get().notifications.map(n => ({ ...n, isRead: true }));
        set({ notifications: updated });
        for (const n of updated) await db.put('notifications', n);
      },

      createGroup: async (data) => {
        const id = generateId();
        const now = new Date().toISOString();
        const orgUnit: OrgUnit = {
          id,
          name: data.name,
          type: data.type || 'groupe',
          description: data.description || '',
          orgId: 'org-1',
          isActive: true,
        };
        const caisse: Caisse = {
          id,
          name: data.name,
          description: data.description || '',
          type: 'GROUP',
          color: data.color || COLOR_PALETTE[get().caisses.filter(c => c.type === 'GROUP').length % COLOR_PALETTE.length],
          orgId: 'org-1',
          createdAt: now,
          updatedAt: now,
        };
        const updatedOrgUnits = [...get().orgUnits, orgUnit];
        const updatedCaisses = [...get().caisses, caisse];
        set({ orgUnits: updatedOrgUnits, caisses: updatedCaisses });
        await db.put('orgUnits', orgUnit);
        await db.put('caisses', caisse);
        await enqueueSync({ id: `sync-org-${id}`, operation: 'create', entityType: 'orgUnits', entityId: id, payload: orgUnit, attempts: 0, lastAttempt: null, createdAt: now });
        await enqueueSync({ id: `sync-caisse-${id}`, operation: 'create', entityType: 'caisses', entityId: id, payload: caisse, attempts: 0, lastAttempt: null, createdAt: now });
      },

      updateGroup: async (id, data) => {
        const now = new Date().toISOString();
        const updatedOrgUnits = get().orgUnits.map(ou =>
          ou.id === id ? { ...ou, ...data } : ou
        );
        const updatedCaisses = get().caisses.map(c =>
          c.id === id ? { ...c, name: data.name ?? c.name, description: data.description ?? c.description, updatedAt: now } : c
        );
        set({ orgUnits: updatedOrgUnits, caisses: updatedCaisses });
        const updatedOu = updatedOrgUnits.find(ou => ou.id === id);
        if (updatedOu) {
          await db.put('orgUnits', updatedOu);
          await enqueueSync({ id: `sync-org-${id}`, operation: 'update', entityType: 'orgUnits', entityId: id, payload: updatedOu, attempts: 0, lastAttempt: null, createdAt: now });
        }
        const updatedCaisse = updatedCaisses.find(c => c.id === id);
        if (updatedCaisse) {
          await db.put('caisses', updatedCaisse);
          await enqueueSync({ id: `sync-caisse-${id}`, operation: 'update', entityType: 'caisses', entityId: id, payload: updatedCaisse, attempts: 0, lastAttempt: null, createdAt: now });
        }
      },

      deleteGroup: async (id) => {
        // Cascade delete: also delete all transactions for this group's caisse
        const groupTxs = get().transactions.filter(t => t.sourceCaisseId === id);
        if (groupTxs.length > 0) {
          for (const tx of groupTxs) {
            await db.delete('transactions', tx.id);
          }
        }
        const now = new Date().toISOString();
        const updatedOrgUnits = get().orgUnits.filter(ou => ou.id !== id);
        const updatedCaisses = get().caisses.filter(c => c.id !== id);
        set({ orgUnits: updatedOrgUnits, caisses: updatedCaisses, transactions: get().transactions.filter(t => t.sourceCaisseId !== id) });
        await db.delete('orgUnits', id);
        await db.delete('caisses', id);
        await enqueueSync({ id: `sync-org-${id}`, operation: 'delete', entityType: 'orgUnits', entityId: id, payload: {}, attempts: 0, lastAttempt: null, createdAt: now });
        await enqueueSync({ id: `sync-caisse-${id}`, operation: 'delete', entityType: 'caisses', entityId: id, payload: {}, attempts: 0, lastAttempt: null, createdAt: now });
      },

      loadInitialData: async () => {
        set({ isLoading: true });
        try {
          const [storedTx, storedCats, storedOrgUnits, storedCaisses, storedEvents, storedAudit, storedConfig, storedNotifs] = await Promise.all([
            db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]),
            db.getAll<Category>('categories').catch(() => DEFAULT_CATEGORIES),
            db.getAll<OrgUnit>('orgUnits').catch(() => DEFAULT_ORG_UNITS),
            db.getAll<Caisse>('caisses').catch(() => DEFAULT_CAISSES),
            db.getAll<Event>('events').catch(() => [] as Event[]),
            db.getAll<any>('auditEntries').catch(() => [] as any[]),
            db.getConfig<AppConfig>('appConfig').catch(() => null),
            db.getAll<NotificationItem>('notifications').catch(() => [] as NotificationItem[]),
          ]);
          const savedRole = await db.getConfig<Role>('selectedRole');
          const sessionId = localStorage.getItem('lumina-session');
          const savedRoleAssignment = sessionId ? await db.getRoleAssignment(sessionId) : null;
          const finalRole = (savedRole ?? (savedRoleAssignment as any)?.role ?? 'TREASURIER') as Role;
          set({
            transactions: storedTx,
            categories: storedCats,
            orgUnits: storedOrgUnits,
            caisses: storedCaisses,
            events: storedEvents,
            auditEntries: storedAudit,
            notifications: storedNotifs,
            appConfig: storedConfig ?? { churchName: '', churchLogoUrl: '', userPhoto: '' },
            user: {
              ...DEFAULT_USER,
              role: finalRole,
            },
            isLoading: false,
          });
        } catch (e) {
          console.error('[store] loadInitialData failed', e);
          set({ isLoading: false });
        }
      },

      setOnline: (isOnline) => set({ isOnline }),
    }),
    {
      name: 'lumina-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
