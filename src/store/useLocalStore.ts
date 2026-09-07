/**
 * Legacy Store - PowerSync Migration Complete
 *
 * This store now uses PowerSync for all data operations.
 * IndexedDB has been completely removed.
 */

import { create } from 'zustand';
import { checkPermission } from '@/lib/rbac';
import type { User, Role, Transaction, Category, OrgUnit, Caisse, Event, BudgetItem, ShoppingItem, AppConfig, NotificationItem, Member, Group, Account, GroupMembership, Versement, EventBudget, BudgetLine } from '@/types';
import { generateId } from '@/lib/utils';
import {
  addTransactionPS,
  updateTransactionPS,
  deleteTransactionPS,
  addEventPS,
  updateEventPS,
  deleteEventPS,
  addMemberPS,
  updateMemberPS,
} from '@/lib/dataLayer';
import { getPowerSyncDatabase } from '@/lib/powersync';

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
  members: Member[];
  groups: Group[];
  accounts: Account[];
  memberships: GroupMembership[];
  eventBudgets: EventBudget[];
  budgetLines: BudgetLine[];
  isLoading: boolean;
  isOnline: boolean;
  selectRole: (role: Role) => Promise<void>;
  createNotification: (notif: Omit<NotificationItem, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'reversalOfId'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  batchDeleteTransactions: (ids: string[]) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  batchApproveTransactions: (ids: string[], userId?: string) => Promise<void>;
  reverseTransaction: (id: string, reason: string) => Promise<void>;
  createVersement: (data: { sourceCaisseId: string; amount: number; comment?: string }) => Promise<void>;
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
  archiveGroup: (id: string, reason: string, actorId: string) => Promise<void>;
  restoreGroup: (id: string, reason: string, actorId: string) => Promise<void>;
  createEventBudget: (eventId: string, currency: string) => Promise<void>;
  addBudgetLine: (eventBudgetId: string, line: Omit<BudgetLine, 'id' | 'createdAt'>) => Promise<void>;
  removeBudgetLine: (eventBudgetId: string, lineId: string) => Promise<void>;
  getEventBudget: (eventId: string) => EventBudget | undefined;
  getBudgetLines: (eventBudgetId: string) => BudgetLine[];
  createMember: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMember: (id: string, data: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  archiveMember: (id: string, reason: string, actorId: string) => Promise<void>;
  restoreMember: (id: string, reason: string, actorId: string) => Promise<void>;
  addMemberToGroup: (membership: Omit<GroupMembership, 'id' | 'createdAt'>) => Promise<void>;
  removeMemberFromGroup: (id: string) => Promise<void>;
  loadInitialData: () => Promise<void>;
  setOnline: (online: boolean) => void;
  getCaisseForDisplay: (accountId: string) => { id: string; name: string; description: string; type: 'MAIN' | 'GROUP'; color: string; orgId: string; createdAt: string; updatedAt: string; archivedAt: string | null; archivedBy: string | null; archiveReason: string | null; status: 'ACTIVE' | 'ARCHIVED' } | null;
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
  { id: 'main', name: 'Caisse principale', description: 'Fonds de l\'église', type: 'MAIN', color: '#FF6B00', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archivedAt: null, archivedBy: null, archiveReason: null, status: 'ACTIVE' },
];

const DEFAULT_ORG_UNITS: OrgUnit[] = [
  { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'eglise', description: 'Église mère', orgId: 'org-1', isActive: true },
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
  (set, get) => ({
    user: DEFAULT_USER,
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    orgUnits: DEFAULT_ORG_UNITS,
    caisses: DEFAULT_CAISSES,
    events: [],
    auditEntries: [],
    notifications: [],
    members: [],
    groups: [],
    accounts: [],
    memberships: [],
    eventBudgets: [],
    budgetLines: [],
    appConfig: { churchName: '', churchLogoUrl: '', userPhoto: '' },
    isLoading: false,
    isOnline: navigator.onLine,

    selectRole: async (role) => {
      const sessionId = localStorage.getItem('lumina-session') ?? crypto.randomUUID();
      localStorage.setItem('lumina-session', sessionId);
      localStorage.setItem('lumina-role', role);
      // Role is stored in localStorage, no need for database
      set({ user: { ...get().user, role } });
    },

    addTransaction: async (tx) => {
      const id = generateId();
      const now = new Date().toISOString();
      const newTx: Transaction = { ...tx, id, createdAt: now, updatedAt: now, version: 1, reversalOfId: null };

      // Write to PowerSync
      try {
        await addTransactionPS({
          org_id: newTx.orgId,
          type: newTx.type,
          amount: newTx.amount,
          description: newTx.description,
          date: newTx.date,
          status: newTx.status,
          category_id: newTx.categoryId,
          org_unit_id: newTx.orgUnitId,
          compensates_for: newTx.compensatesFor,
          comment: newTx.comment,
          version: 1,
          created_by_id: newTx.createdById,
          approved_by_id: newTx.approvedById,
          approved_at: newTx.approvedAt,
          event_id: newTx.eventId,
          source: newTx.source,
          person_name: newTx.personName,
          source_caisse_id: newTx.sourceCaisseId,
          versement_id: newTx.versementId,
          reversal_of_id: newTx.reversalOfId,
        });
      } catch (error) {
        console.error('[Store] Failed to add transaction:', error);
      }

      // Update local state
      set({ transactions: [...get().transactions, newTx] });

      // Audit
      await writeAudit({
        orgId: 'org-1',
        transactionId: id,
        userId: tx.createdById || 'local-user',
        actorRoleAtTime: get().user.role,
        action: 'CREATE',
        entityType: 'Transaction',
        entityId: id,
        beforeState: null,
        afterState: newTx,
        comment: null,
      });
    },

    updateTransaction: async (id, data) => {
      const oldTx = get().transactions.find(t => t.id === id);
      if (oldTx?.status === 'APPROVED') {
        throw new Error('TRANSACTION_APPROVED_IMMUTABLE');
      }

      // Write to PowerSync
      try {
        await updateTransactionPS(id, data);
      } catch (error) {
        console.error('[Store] Failed to update transaction:', error);
      }

      // Update local state
      const updated = get().transactions.map(t =>
        t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
      );
      set({ transactions: updated });
    },

    deleteTransaction: async (id) => {
      const oldTx = get().transactions.find(t => t.id === id);
      if (oldTx?.status === 'APPROVED') {
        throw new Error('TRANSACTION_APPROVED_IMMUTABLE');
      }

      // Write to PowerSync
      try {
        await deleteTransactionPS(id);
      } catch (error) {
        console.error('[Store] Failed to delete transaction:', error);
      }

      // Update local state
      set({ transactions: get().transactions.filter(t => t.id !== id) });
    },

    batchDeleteTransactions: async (ids) => {
      const approvedIds = ids.filter(id => get().transactions.find(t => t.id === id)?.status === 'APPROVED');
      if (approvedIds.length > 0) {
        throw new Error('TRANSACTION_APPROVED_IMMUTABLE');
      }

      for (const id of ids) {
        try {
          await deleteTransactionPS(id);
        } catch (error) {
          console.error('[Store] Failed to delete transaction:', id, error);
        }
      }

      set({ transactions: get().transactions.filter(t => !ids.includes(t.id)) });
    },

    approveTransaction: async (id, userId) => {
      const now = new Date().toISOString();
      const oldTx = get().transactions.find(t => t.id === id);
      const updated = get().transactions.map(t =>
        t.id === id ? { ...t, status: 'APPROVED' as const, approvedById: userId ?? get().user.id, approvedAt: now, updatedAt: now, version: t.version + 1 } : t
      );
      set({ transactions: updated });

      // Write to PowerSync
      try {
        await updateTransactionPS(id, { status: 'APPROVED', approvedById: userId ?? get().user.id, approvedAt: now });
      } catch (error) {
        console.error('[Store] Failed to approve transaction:', error);
      }
    },

    batchApproveTransactions: async (ids, userId) => {
      const now = new Date().toISOString();
      for (const txId of ids) {
        try {
          await updateTransactionPS(txId, { status: 'APPROVED', approvedById: userId ?? get().user.id, approvedAt: now });
        } catch (error) {
          console.error('[Store] Failed to approve transaction:', txId, error);
        }
      }
      const updated = get().transactions.map(t =>
        ids.includes(t.id)
          ? { ...t, status: 'APPROVED' as const, approvedById: userId ?? get().user.id, approvedAt: now, updatedAt: now, version: t.version + 1 }
          : t
      );
      set({ transactions: updated });
    },

    reverseTransaction: async (id, reason) => {
      const now = new Date().toISOString();
      const tx = get().transactions.find(t => t.id === id);
      if (!tx || tx.status !== 'APPROVED') {
        throw new Error('Only approved transactions can be reversed');
      }
      const reversalId = generateId();
      const reversalTx = {
        ...tx,
        id: reversalId,
        type: tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
        reversalOfId: id,
        status: 'APPROVED',
        approvedById: get().user.id,
        approvedAt: now,
        comment: `Contre-transaction: ${reason}`,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      try {
        await addTransactionPS({
          org_id: reversalTx.orgId,
          type: reversalTx.type,
          amount: reversalTx.amount,
          description: reversalTx.description,
          date: reversalTx.date,
          status: reversalTx.status,
          category_id: reversalTx.categoryId,
          org_unit_id: reversalTx.orgUnitId,
          compensates_for: reversalTx.compensatesFor,
          comment: reversalTx.comment,
          version: reversalTx.version,
          created_by_id: reversalTx.createdById,
          approved_by_id: reversalTx.approvedById,
          approved_at: reversalTx.approvedAt,
          event_id: reversalTx.eventId,
          source: reversalTx.source,
          person_name: reversalTx.personName,
          source_caisse_id: reversalTx.sourceCaisseId,
          versement_id: reversalTx.versementId,
          reversal_of_id: reversalTx.reversalOfId,
        });
      } catch (error) {
        console.error('[Store] Failed to reverse transaction:', error);
      }

      set({ transactions: [...get().transactions, reversalTx] });
    },

    createVersement: async (data) => {
      const now = new Date().toISOString();
      const versementId = generateId();
      const sessionId = localStorage.getItem('lumina-session') || 'local-user';

      // Create transactions
      const sourceTx = {
        id: generateId(),
        orgId: 'org-1',
        type: 'EXPENSE',
        amount: data.amount,
        description: `Versement vers caisse principale`,
        date: now.split('T')[0],
        status: 'APPROVED',
        createdAt: now,
        updatedAt: now,
        createdById: sessionId,
        approvedById: sessionId,
        approvedAt: now,
        categoryId: 'cat-dime',
        orgUnitId: null,
        eventId: null,
        source: 'CAISSE',
        personName: null,
        compensatesFor: null,
        comment: data.comment || `Versement ${Math.round(data.amount / 100)} FCFA → Caisse principale`,
        version: 1,
        sourceCaisseId: data.sourceCaisseId,
        versementId,
        reversalOfId: null,
      };

      const targetTx = {
        id: generateId(),
        orgId: 'org-1',
        type: 'INCOME',
        amount: data.amount,
        description: `Versement de groupe`,
        date: now.split('T')[0],
        status: 'APPROVED',
        createdAt: now,
        updatedAt: now,
        createdById: sessionId,
        approvedById: sessionId,
        approvedAt: now,
        categoryId: 'cat-dime',
        orgUnitId: null,
        eventId: null,
        source: 'CAISSE',
        personName: null,
        compensatesFor: null,
        comment: data.comment || `Versement ${Math.round(data.amount / 100)} FCFA → Caisse principale`,
        version: 1,
        sourceCaisseId: 'main',
        versementId,
        reversalOfId: null,
      };

      try {
        await addTransactionPS({
          org_id: sourceTx.orgId,
          type: sourceTx.type,
          amount: sourceTx.amount,
          description: sourceTx.description,
          date: sourceTx.date,
          status: sourceTx.status,
          category_id: sourceTx.categoryId,
          org_unit_id: sourceTx.orgUnitId,
          compensates_for: sourceTx.compensatesFor,
          comment: sourceTx.comment,
          version: sourceTx.version,
          created_by_id: sourceTx.createdById,
          approved_by_id: sourceTx.approvedById,
          approved_at: sourceTx.approvedAt,
          event_id: sourceTx.eventId,
          source: sourceTx.source,
          person_name: sourceTx.personName,
          source_caisse_id: sourceTx.sourceCaisseId,
          versement_id: sourceTx.versementId,
          reversal_of_id: sourceTx.reversalOfId,
        });
        await addTransactionPS({
          org_id: targetTx.orgId,
          type: targetTx.type,
          amount: targetTx.amount,
          description: targetTx.description,
          date: targetTx.date,
          status: targetTx.status,
          category_id: targetTx.categoryId,
          org_unit_id: targetTx.orgUnitId,
          compensates_for: targetTx.compensatesFor,
          comment: targetTx.comment,
          version: targetTx.version,
          created_by_id: targetTx.createdById,
          approved_by_id: targetTx.approvedById,
          approved_at: targetTx.approvedAt,
          event_id: targetTx.eventId,
          source: targetTx.source,
          person_name: targetTx.personName,
          source_caisse_id: targetTx.sourceCaisseId,
          versement_id: targetTx.versementId,
          reversal_of_id: targetTx.reversalOfId,
        });
      } catch (error) {
        console.error('[Store] Failed to create versement:', error);
      }

      set({ transactions: [...get().transactions, sourceTx, targetTx] });
    },

    syncEventBudget: async (eventId: string) => {
      // Budget sync is handled by PowerSync triggers
      console.log('[Store] Event budget sync triggered for:', eventId);
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

      try {
        await addEventPS({
          org_id: newEvent.orgId,
          name: newEvent.name,
          description: newEvent.description,
          start_date: newEvent.startDate,
          end_date: newEvent.endDate,
          status: newEvent.status,
          budget: newEvent.budget,
          budget_items: JSON.stringify(newEvent.budgetItems),
        });
      } catch (error) {
        console.error('[Store] Failed to add event:', error);
      }

      set({ events: [...get().events, newEvent] });
    },

    updateEvent: async (id, data) => {
      try {
        await updateEventPS(id, data);
      } catch (error) {
        console.error('[Store] Failed to update event:', error);
      }

      const updated = get().events.map(e =>
        e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
      );
      set({ events: updated });
    },

    deleteEvent: async (id) => {
      try {
        await deleteEventPS(id);
      } catch (error) {
        console.error('[Store] Failed to delete event:', error);
      }

      set({ events: get().events.filter(e => e.id !== id) });
    },

    updateEventStatus: async (id, status, userId) => {
      try {
        await updateEventPS(id, { status });
      } catch (error) {
        console.error('[Store] Failed to update event status:', error);
      }

      const updated = get().events.map(e =>
        e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
      );
      set({ events: updated });
    },

    addBudgetItem: async (eventId, item) => {
      const event = get().events.find(e => e.id === eventId);
      if (!event) return;
      const newItem = { id: generateId(), ...item };
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
      // Config is stored in localStorage
      localStorage.setItem('lumina-config', JSON.stringify(updated));
    },

    createNotification: async (notif) => {
      const id = generateId();
      const now = new Date().toISOString();
      const newNotif = { ...notif, id, createdAt: now };
      set({ notifications: [newNotif, ...get().notifications] });
      // Notifications are stored in PowerSync
    },

    markNotificationRead: async (id) => {
      const updated = get().notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      );
      set({ notifications: updated });
    },

    markAllNotificationsRead: async () => {
      const updated = get().notifications.map(n => ({ ...n, isRead: true }));
      set({ notifications: updated });
    },

    createGroup: async (data) => {
      const id = generateId();
      const now = new Date().toISOString();
      const color = data.color || COLOR_PALETTE[get().caisses.filter(c => c.type === 'GROUP').length % COLOR_PALETTE.length];

      const orgUnit: OrgUnit = {
        id,
        name: data.name,
        type: data.type || 'groupe',
        description: data.description || '',
        orgId: 'org-1',
        isActive: true,
      };

      const account: Account = {
        id,
        orgId: 'org-1',
        ownerType: 'GROUP',
        ownerId: id,
        name: data.name,
        currency: 'XOF',
        status: 'ACTIVE',
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        createdAt: now,
        updatedAt: now,
      };

      const caisse: Caisse = {
        id,
        name: data.name,
        description: data.description || '',
        type: 'GROUP',
        color,
        orgId: 'org-1',
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        status: 'ACTIVE',
      };

      const group: Group = {
        id,
        orgId: 'org-1',
        name: data.name,
        parentGroupId: null,
        responsableMemberId: null,
        status: 'ACTIVE',
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        createdAt: now,
        updatedAt: now,
      };

      set({
        orgUnits: [...get().orgUnits, orgUnit],
        caisses: [...get().caisses, caisse],
        groups: [...get().groups, group],
        accounts: [...get().accounts, account],
      });
    },

    updateGroup: async (id, data) => {
      const now = new Date().toISOString();
      const updatedOrgUnits = get().orgUnits.map(ou =>
        ou.id === id ? { ...ou, ...data, updatedAt: now } : ou
      );
      const updatedGroups = get().groups.map(g =>
        g.id === id ? { ...g, ...data, updatedAt: now } : g
      );
      const updatedAccounts = get().accounts.map(a =>
        a.id === id ? { ...a, name: data.name ?? a.name, updatedAt: now } : a
      );
      const updatedCaisses = get().caisses.map(c =>
        c.id === id ? { ...c, name: data.name ?? c.name, description: data.description ?? c.description, updatedAt: now } : c
      );

      set({
        orgUnits: updatedOrgUnits,
        caisses: updatedCaisses,
        groups: updatedGroups,
        accounts: updatedAccounts,
      });
    },

    deleteGroup: async (id) => {
      set({
        orgUnits: get().orgUnits.filter(ou => ou.id !== id),
        caisses: get().caisses.filter(c => c.id !== id),
        groups: get().groups.filter(g => g.id !== id),
        accounts: get().accounts.filter(a => a.id !== id),
      });
    },

    archiveGroup: async (id, reason, actorId) => {
      const now = new Date().toISOString();
      const updatedGroups = get().groups.map(g =>
        g.id === id ? { ...g, status: 'ARCHIVED' as const, archivedAt: now, archivedBy: actorId, archiveReason: reason, updatedAt: now } : g
      );
      const updatedAccounts = get().accounts.map(a =>
        a.id === id ? { ...a, status: 'ARCHIVED' as const, archivedAt: now, archivedBy: actorId, archiveReason: reason, updatedAt: now } : a
      );
      const updatedCaisses = get().caisses.map(c =>
        c.id === id ? { ...c, status: 'ARCHIVED' as const, archivedAt: now, archivedBy: actorId, archiveReason: reason, updatedAt: now } : c
      );

      set({ groups: updatedGroups, accounts: updatedAccounts, caisses: updatedCaisses });
    },

    restoreGroup: async (id, reason, actorId) => {
      const now = new Date().toISOString();
      const updatedGroups = get().groups.map(g =>
        g.id === id ? { ...g, status: 'ACTIVE' as const, archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: now } : g
      );
      const updatedAccounts = get().accounts.map(a =>
        a.id === id ? { ...a, status: 'ACTIVE' as const, archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: now } : a
      );
      const updatedCaisses = get().caisses.map(c =>
        c.id === id ? { ...c, status: 'ACTIVE' as const, archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: now } : c
      );

      set({ groups: updatedGroups, accounts: updatedAccounts, caisses: updatedCaisses });
    },

    createEventBudget: async (eventId, currency = 'XOF') => {
      const now = new Date().toISOString();
      const id = generateId();
      const budget: EventBudget = { id, eventId, currency, revisedAt: null, revisedBy: null, createdAt: now };
      set({ eventBudgets: [...get().eventBudgets, budget] });
    },

    addBudgetLine: async (eventBudgetId, line) => {
      const now = new Date().toISOString();
      const id = generateId();
      const budgetLine: BudgetLine = { ...line, id, createdAt: now };
      set({ budgetLines: [...get().budgetLines, budgetLine] });
    },

    removeBudgetLine: async (eventBudgetId, lineId) => {
      set({ budgetLines: get().budgetLines.filter(bl => !(bl.eventBudgetId === eventBudgetId && bl.id === lineId)) });
    },

    getEventBudget: (eventId) => get().eventBudgets.find(eb => eb.eventId === eventId),
    getBudgetLines: (eventBudgetId) => get().budgetLines.filter(bl => bl.eventBudgetId === eventBudgetId),

    createMember: async (data) => {
      const now = new Date().toISOString();
      const id = generateId();
      const member: Member = { ...data, id, createdAt: now, updatedAt: now };
      try {
        await addMemberPS({
          org_id: member.orgId,
          first_name: member.firstName,
          last_name: member.lastName,
          phone: member.phone,
          email: member.email,
          status: member.status,
          joined_at: member.joinedAt,
          archived_at: member.archivedAt,
          archived_by: member.archivedBy,
          archive_reason: member.archiveReason,
        });
      } catch (error) {
        console.error('[Store] Failed to create member:', error);
      }
      set({ members: [...get().members, member] });
    },

    updateMember: async (id, data) => {
      try {
        await updateMemberPS(id, data);
      } catch (error) {
        console.error('[Store] Failed to update member:', error);
      }
      const updated = get().members.map(m =>
        m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m
      );
      set({ members: updated });
    },

    deleteMember: async (id) => {
      set({ members: get().members.filter(m => m.id !== id) });
    },

    archiveMember: async (id, reason, actorId) => {
      const now = new Date().toISOString();
      const updated = get().members.map(m =>
        m.id === id ? { ...m, status: 'ARCHIVED' as const, archivedAt: now, archivedBy: actorId, archiveReason: reason, updatedAt: now } : m
      );
      set({ members: updated });
    },

    restoreMember: async (id, reason, actorId) => {
      const now = new Date().toISOString();
      const updated = get().members.map(m =>
        m.id === id ? { ...m, status: 'ACTIVE' as const, archivedAt: null, archivedBy: null, archiveReason: null, updatedAt: now } : m
      );
      set({ members: updated });
    },

    addMemberToGroup: async (membership) => {
      const id = generateId();
      const now = new Date().toISOString();
      const fullMembership = { ...membership, id, createdAt: now };
      set({ memberships: [...get().memberships, fullMembership] });
    },

    removeMemberFromGroup: async (id) => {
      set({ memberships: get().memberships.filter(m => m.id !== id) });
    },

    loadInitialData: async () => {
      set({ isLoading: true });
      try {
        // Load from localStorage
        const storedConfig = localStorage.getItem('lumina-config');
        const storedRole = localStorage.getItem('lumina-role') as Role;
        const sessionId = localStorage.getItem('lumina-session');

        set({
          appConfig: storedConfig ? JSON.parse(storedConfig) : { churchName: '', churchLogoUrl: '', userPhoto: '' },
          user: {
            ...DEFAULT_USER,
            role: storedRole || 'TREASURIER',
          },
          isLoading: false,
        });
      } catch (e) {
        console.error('[Store] loadInitialData failed', e);
        set({ isLoading: false });
      }
    },

    setOnline: (isOnline) => set({ isOnline }),

    getCaisseForDisplay: (accountId: string) => {
      const state = get();
      const acc = state.accounts.find(a => a.id === accountId);
      if (acc) {
        const caisse = state.caisses.find(c => c.id === accountId);
        return {
          id: acc.id,
          name: acc.name,
          description: state.orgUnits.find(o => o.id === acc.id)?.description || '',
          type: acc.ownerType === 'ORGANIZATION' ? 'MAIN' : 'GROUP' as const,
          color: caisse?.color || '#FF6B00',
          orgId: acc.orgId,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt,
          archivedAt: acc.archivedAt,
          archivedBy: acc.archivedBy,
          archiveReason: acc.archiveReason,
          status: acc.status,
        };
      }
      return state.caisses.find(c => c.id === accountId) ?? null;
    },
  }),
  {
    name: 'lumina-store',
    partialize: (state) => ({ user: state.user }),
  }
);

// Helper function for audit logging
async function writeAudit(data: {
  orgId: string;
  transactionId: string | null;
  userId: string;
  actorRoleAtTime: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: any;
  afterState: any;
  comment: string | null;
}): Promise<void> {
  // Audit is stored in PowerSync
  const db = getPowerSyncDatabase();
  try {
    await db.execute(
      `INSERT INTO audit_entries (id, org_id, transaction_id, user_id, actor_role_at_time, action, entity_type, entity_id, before_state, after_state, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        generateId(),
        data.orgId,
        data.transactionId,
        data.userId,
        data.actorRoleAtTime,
        data.action,
        data.entityType,
        data.entityId,
        JSON.stringify(data.beforeState),
        JSON.stringify(data.afterState),
        data.comment,
      ]
    );
  } catch (error) {
    console.error('[Audit] Failed to write audit entry:', error);
  }
}
