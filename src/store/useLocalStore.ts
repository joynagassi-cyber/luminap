import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import type { User, Role, Transaction, Category, OrgUnit, Caisse, Event } from '@/types';

interface LocalStoreState {
  user: User;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  events: Event[];
  isLoading: boolean;
  isOnline: boolean;
  selectRole: (role: Role) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  approveTransaction: (id: string, userId?: string) => Promise<void>;
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'version'>) => Promise<void>;
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
  { id: 'org-messieurs', name: 'Messieurs', description: 'Groupe des messieurs', type: 'GROUP', color: '#14B8C6', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'org-chorale', name: 'Chorale', description: 'Groupe de la chorale', type: 'GROUP', color: '#F59E0B', orgId: 'org-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const DEFAULT_ORG_UNITS: OrgUnit[] = [
  { id: 'org-diactes', name: 'Diacres', type: 'groupe', description: 'Groupe des diacres', orgId: 'org-1', isActive: true },
  { id: 'org-jeunesse', name: 'Jeunesse', type: 'groupe', description: 'Groupe de jeunesse', orgId: 'org-1', isActive: true },
  { id: 'org-dames', name: 'Dames', type: 'groupe', description: 'Groupe des dames', orgId: 'org-1', isActive: true },
  { id: 'org-messieurs', name: 'Messieurs', type: 'groupe', description: 'Groupe des messieurs', orgId: 'org-1', isActive: true },
  { id: 'org-chorale', name: 'Chorale', type: 'groupe', description: 'Groupe de la chorale', orgId: 'org-1', isActive: true },
];

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
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const now = new Date().toISOString();
        const newTx: Transaction = { ...tx, id, createdAt: now, updatedAt: now, version: 1 };
        const updated = [...get().transactions, newTx];
        set({ transactions: updated });
        await db.put('transactions', newTx);
      },

      updateTransaction: async (id, data) => {
        const updated = get().transactions.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString(), version: t.version + 1 } : t);
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
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const now = new Date().toISOString();
        const newEvent: Event = { ...event, id, createdAt: now, updatedAt: now };
        const updated = [...get().events, newEvent];
        set({ events: updated });
        await db.put('events', newEvent);
      },

      loadInitialData: async () => {
        set({ isLoading: true });
        try {
          const [storedTx, storedCats, storedOrgUnits, storedCaisses, storedEvents] = await Promise.all([
            db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]),
            db.getAll<Category>('categories').catch(() => DEFAULT_CATEGORIES),
            db.getAll<OrgUnit>('orgUnits').catch(() => DEFAULT_ORG_UNITS),
            db.getAll<Caisse>('caisses').catch(() => DEFAULT_CAISSES),
            db.getAll<Event>('events').catch(() => [] as Event[]),
          ]);
          const savedRole = await db.getConfig<Role>('selectedRole');
          const sessionId = localStorage.getItem('lumina-session');
          const savedRoleAssignment = sessionId ? await db.getRoleAssignment(sessionId) : null;
          set({
            transactions: storedTx,
            categories: storedCats,
            orgUnits: storedOrgUnits,
            caisses: storedCaisses,
            events: storedEvents,
            user: {
              ...DEFAULT_USER,
              role: savedRole ?? savedRoleAssignment?.role ?? 'TREASURIER',
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
