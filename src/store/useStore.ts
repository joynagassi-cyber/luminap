import { create } from 'zustand';
import { useEffect } from 'react';
import type { Transaction, Category, OrgUnit, AuditEntry, User, Role } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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

export const useStore = create<AppState & StoreActions>((set, get) => ({
  isAuthenticated: false,
  user: null,
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  isLoading: true,
  error: null,

  // Restore session on mount
  __hydrate: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const user: User = {
        id: session.user.id,
        email: session.user.email,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        role: (profile?.role as 'ADMIN' | 'TREASURER' | 'APPROVER') || 'TREASURER',
        org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' },
      };
      set({ isAuthenticated: true, user, isLoading: false });
      await get().refreshData();
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ error: 'Identifiants invalides' });
        return false;
      }
      if (data.user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const user: User = {
          id: data.user.id,
          email: data.user.email,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          role: (profile?.role as 'ADMIN' | 'TREASURER' | 'APPROVER') || 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' },
        };
        set({ isAuthenticated: true, user, error: null });
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, role: 'TREASURER' },
        },
      });
      if (error) {
        if (error.message?.includes('already registered')) {
          set({ error: 'Cet email est déjà utilisé' });
        } else {
          set({ error: error.message });
        }
        return false;
      }
      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          firstName,
          lastName,
          role: 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' },
        };
        set({ isAuthenticated: true, user, error: null });
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
    await supabase.auth.signOut();
    set({ isAuthenticated: false, user: null, transactions: [], categories: [], orgUnits: [], auditEntries: [] });
  },

  refreshData: async () => {
    try {
      const { data: categories } = await supabase.from('categories').select('*');
      const { data: orgUnits } = await supabase.from('org_units').select('*');
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`*, category:categories(*), creator:profiles!created_by_id(id, email, first_name, last_name, role), approver:profiles!approved_by_id(id, email, first_name, last_name, role)`)
        .order('created_at', { ascending: false });

      const { data: auditEntries } = await supabase
        .from('audit_entries')
        .select(`*, user:profiles!user_id(id, email, first_name, last_name, role)`)
        .order('created_at', { ascending: false });

      set({
        categories: (categories || []).map((c: any) => ({
          id: c.id, key: c.key, labelFr: c.label_fr, type: c.type, orgId: c.org_id,
        })),
        orgUnits: (orgUnits || []).map((o: any) => ({
          id: o.id, name: o.name, type: o.type, orgId: o.org_id,
        })),
        transactions: (transactions || []).map((t: any) => ({
          ...t,
          orgId: t.org_id,
          categoryId: t.category_id,
          orgUnitId: t.org_unit_id,
          compensatesFor: t.compensates_for,
          createdById: t.created_by_id,
          approvedById: t.approved_by_id,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          approvedAt: t.approved_at,
          category: t.category ? { id: t.category.id, key: t.category.key, labelFr: t.category.label_fr, type: t.category.type, orgId: t.category.org_id } : undefined,
          creator: t.creator ? { id: t.creator.id, email: t.creator.email, firstName: t.creator.first_name, lastName: t.creator.last_name, role: t.creator.role as Role, org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' } } : undefined,
          approver: t.approver ? { id: t.approver.id, email: t.approver.email, firstName: t.approver.first_name, lastName: t.approver.last_name, role: t.approver.role as Role, org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' } } : undefined,
        })),
        auditEntries: (auditEntries || []).map((a: any) => ({
          ...a,
          orgId: a.org_id,
          transactionId: a.transaction_id,
          userId: a.user_id,
          createdAt: a.created_at,
          user: a.user ? { id: a.user.id, email: a.user.email, firstName: a.user.first_name, lastName: a.user.last_name, role: a.user.role as Role, org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' } } : undefined,
        })),
        error: null,
      });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (tx) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      const id = `tx-${Date.now()}`;
      const { error } = await supabase.from('transactions').insert({
        id,
        org_id: 'org-1',
        type: tx.type,
        amount: Math.round(tx.amount),
        description: tx.description,
        date: tx.date,
        status: tx.status,
        category_id: tx.categoryId,
        org_unit_id: tx.orgUnitId || null,
        created_by_id: user.user.id,
      });
      if (error) throw error;
      await get().refreshData();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          version: updates.version || 1,
        })
        .eq('id', id);
      if (error) throw error;
      await get().refreshData();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  approveTransaction: async (id) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'APPROVED',
          approved_by_id: user.user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await get().refreshData();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  rejectTransaction: async (id, comment) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'REJECTED',
          comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await get().refreshData();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      set(s => ({ transactions: s.transactions.filter(t => t.id !== id), error: null }));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));

// React hook version that handles auth state subscription
export function useStoreHydrate() {
  useEffect(() => {
    useStore.getState().__hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const user: User = {
          id: session.user.id,
          email: session.user.email,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          role: (profile?.role as 'ADMIN' | 'TREASURER' | 'APPROVER') || 'TREASURER',
          org: { id: 'org-1', name: 'Église MFE-JC Centrale', type: 'Eglise', accentColor: '#FF6B00' },
        };
        useStore.setState({ isAuthenticated: true, user });
        await useStore.getState().refreshData();
      } else {
        useStore.setState({ isAuthenticated: false, user: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}

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
