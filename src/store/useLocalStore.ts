import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import type { User, Role, Transaction, Category, OrgUnit, Caisse, Event, BudgetItem, ShoppingItem, AppConfig } from '@/types';
import { generateId } from '@/lib/utils';

interface LocalStoreState {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  events: Event[];
  auditEntries: any[];
  appConfig: AppConfig;
  isLoading: boolean;
  isOnline: boolean;
  selectRole: (role: Role) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEventStatus: (id: string, status: Event['status'], userId?: string) => Promise<void>;
  addBudgetItem: (eventId: string, item: Omit<BudgetItem, 'id'>) => Promise<void>;
  removeBudgetItem: (eventId: string, itemId: string) => Promise<void>;
  addShoppingItem: (eventId: string, item: Omit<ShoppingItem, 'id'>) => Promise<void>;
  removeShoppingItem: (eventId: string, itemId: string) => Promise<void>;
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
      },

      updateTransaction: async (id, data) => {
        const updated = get().transactions.map(t =>
          t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
        );
        set({ transactions: updated });
        const updatedTx = updated.find(t => t.id === id);
        if (updatedTx) await db.put('transactions', updatedTx);
      },

      deleteTransaction: async (id) => {
        const updated = get().transactions.filter(t => t.id !== id);
        set({ transactions: updated });
        await db.delete('transactions', id);
      },

      approveTransaction: async (id, userId) => {
        const now = new Date().toISOString();
        const updated = get().transactions.map(t =>
          t.id === id ? { ...t, status: 'APPROVED' as const, approvedById: userId ?? get().user.id, approvedAt: now, updatedAt: now, version: t.version + 1 } : t
        );
        set({ transactions: updated });
        const updatedTx = updated.find(t => t.id === id);
        if (updatedTx) await db.put('transactions', updatedTx);
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
      },

      updateEvent: async (id, data) => {
        const updated = get().events.map(e =>
          e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
        );
        set({ events: updated });
        const updatedEvent = updated.find(e => e.id === id);
        if (updatedEvent) await db.put('events', updatedEvent);
      },

      deleteEvent: async (id) => {
        const updated = get().events.filter(e => e.id !== id);
        set({ events: updated });
        await db.delete('events', id);
      },

      updateEventStatus: async (id, status) => {
        const now = new Date().toISOString();
        const updated = get().events.map(e =>
          e.id === id ? { ...e, status, updatedAt: now } : e
        );
        set({ events: updated });
        const updatedEvent = updated.find(e => e.id === id);
        if (updatedEvent) await db.put('events', updatedEvent);
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

      updateConfig: async (config) => {
        const current = get().appConfig;
        const updated = { ...current, ...config };
        set({ appConfig: updated });
        await db.setConfig('appConfig', updated);
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
      },

      updateGroup: async (id, data) => {
        const updatedOrgUnits = get().orgUnits.map(ou =>
          ou.id === id ? { ...ou, ...data } : ou
        );
        const updatedCaisses = get().caisses.map(c =>
          c.id === id ? { ...c, name: data.name ?? c.name, description: data.description ?? c.description, updatedAt: new Date().toISOString() } : c
        );
        set({ orgUnits: updatedOrgUnits, caisses: updatedCaisses });
        const updatedOu = updatedOrgUnits.find(ou => ou.id === id);
        if (updatedOu) await db.put('orgUnits', updatedOu);
        const updatedCaisse = updatedCaisses.find(c => c.id === id);
        if (updatedCaisse) await db.put('caisses', updatedCaisse);
      },

      deleteGroup: async (id) => {
        const caisse = get().caisses.find(c => c.id === id);
        if (caisse) {
          const txs = get().transactions.filter(t => t.sourceCaisseId === id && t.status === 'APPROVED');
          const balance = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0) - txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
          if (balance !== 0) {
            throw new Error('Le groupe a un solde non nul. Veuillez le vider avant de supprimer.');
          }
        }
        const updatedOrgUnits = get().orgUnits.filter(ou => ou.id !== id);
        const updatedCaisses = get().caisses.filter(c => c.id !== id);
        set({ orgUnits: updatedOrgUnits, caisses: updatedCaisses });
        await db.delete('orgUnits', id);
        await db.delete('caisses', id);
      },

      loadInitialData: async () => {
        set({ isLoading: true });
        try {
          const [storedTx, storedCats, storedOrgUnits, storedCaisses, storedEvents, storedAudit, storedConfig] = await Promise.all([
            db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]),
            db.getAll<Category>('categories').catch(() => DEFAULT_CATEGORIES),
            db.getAll<OrgUnit>('orgUnits').catch(() => DEFAULT_ORG_UNITS),
            db.getAll<Caisse>('caisses').catch(() => DEFAULT_CAISSES),
            db.getAll<Event>('events').catch(() => [] as Event[]),
            db.getAll<any>('auditEntries').catch(() => [] as any[]),
            db.getConfig<AppConfig>('appConfig').catch(() => null),
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
