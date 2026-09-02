import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Transaction, Category, OrgUnit, AuditEntry, Profile } from '@/integrations/supabase/client';

interface LuminaState {
  isAuthenticated: boolean;
  user: { id: string; email: string; profile: Profile | null } | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;

  addTransaction: (tx: {
    type: string; amount: number; description: string; date: string;
    categoryId: string; orgUnitId?: string; status: string;
  }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  approveTransaction: (id: string, approverId: string) => Promise<void>;
  rejectTransaction: (id: string, comment: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useStore = create<LuminaState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  isLoading: true,
  error: null,

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ error: error?.message || 'Identifiants invalides' });
      return false;
    }
    await get().refreshData();
    return true;
  },

  signup: async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error || !data.user) {
      set({ error: error?.message || 'Échec de l\'inscription' });
      return false;
    }
    await get().refreshData();
    return true;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ isAuthenticated: false, user: null, transactions: [], categories: [], orgUnits: [], auditEntries: [] });
  },

  refreshData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch all categories
    const { data: cats } = await supabase.from('categories').select('*');

    // Fetch all org units
    const { data: orgs } = await supabase.from('org_units').select('*');

    // Fetch transactions with full relations (categories + org_units)
    const { data: txs } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        org_unit:org_units(*)
      `)
      .order('date', { ascending: false });

    // Fetch audit entries
    const { data: audits } = await supabase
      .from('audit_entries')
      .select('*')
      .order('created_at', { ascending: false });

    set({
      isAuthenticated: true,
      user: { id: user.id, email: user.email!, profile },
      categories: cats || [],
      orgUnits: orgs || [],
      transactions: txs || [],
      auditEntries: audits || [],
      isLoading: false,
      error: null,
    });
  },

  addTransaction: async (tx) => {
    const { user } = get();
    const newTx = {
      id: `tx-${Date.now()}`,
      org_id: 'org-1',
      type: tx.type,
      amount: Math.round(tx.amount),
      description: tx.description,
      date: tx.date,
      status: tx.status as 'DRAFT' | 'PENDING',
      category_id: tx.categoryId,
      org_unit_id: tx.orgUnitId || null,
      compensates_for: null,
      comment: null,
      version: 1,
      created_by_id: user?.id || null,
      approved_by_id: null,
      approved_at: null,
    };

    const { error } = await supabase.from('transactions').insert(newTx);
    if (error) { set({ error: error.message }); return; }
    get().refreshData();
  },

  updateTransaction: async (id, updates) => {
    const { error } = await supabase.from('transactions').update(updates).eq('id', id);
    if (error) { set({ error: error.message }); return; }
    get().refreshData();
  },

  approveTransaction: async (id, approverId) => {
    const { error } = await supabase.from('transactions').update({
      status: 'APPROVED',
      approved_by_id: approverId,
      approved_at: new Date().toISOString(),
      version: 1,
    }).eq('id', id);
    if (error) { set({ error: error.message }); return; }
    get().refreshData();
  },

  rejectTransaction: async (id, comment) => {
    const { error } = await supabase.from('transactions').update({
      status: 'REJECTED',
      comment,
      version: 1,
    }).eq('id', id);
    if (error) { set({ error: error.message }); return; }
    get().refreshData();
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) { set({ error: error.message }); return; }
    get().refreshData();
  },
}));

// Real-time subscription
let subscription: ReturnType<typeof supabase.channel> | null = null;

export function setupRealtime() {
  if (subscription) return;
  subscription = supabase
    .channel('lumina-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' },
      () => { get().refreshData(); }
    )
    .subscribe();
}

export function teardownRealtime() {
  if (subscription) {
    supabase.removeChannel(subscription);
    subscription = null;
  }
}

export function canActOnTransaction(
  transaction: Transaction | undefined,
  action: 'approve' | 'reject' | 'edit' | 'delete',
  currentUser: { id: string; profile: Profile | null } | null,
): boolean {
  if (!transaction || !currentUser) return false;
  switch (action) {
    case 'edit': return transaction.status === 'DRAFT' || transaction.status === 'REJECTED';
    case 'delete': return transaction.status === 'REJECTED';
    case 'approve': return transaction.status === 'PENDING' && currentUser.profile?.role !== 'TREASURER';
    case 'reject': return transaction.status === 'PENDING' && currentUser.profile?.role !== 'TREASURER';
    default: return false;
  }
}
