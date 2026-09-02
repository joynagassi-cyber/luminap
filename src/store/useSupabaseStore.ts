import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Transaction, Category, OrgUnit, AuditEntry } from '@/types';
import type { Profile, Transaction as DbTransaction, Category as DbCategory, OrgUnit as DbOrgUnit, AuditEntry as DbAuditEntry } from '@/integrations/supabase/client';

// ─── Mapping helpers ───────────────────────────────────────────

function mapDbProfileToUser(profile: Profile & { email?: string | null }): User {
  return {
    id: profile.id,
    email: profile.email ?? profile.email ?? '',
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    role: (profile.role as User['role']) ?? 'TREASURER',
    org: {
      id: profile.org_id ?? 'org-1',
      name: 'Église MFE-JC Centrale',
      type: 'Eglise',
      accentColor: '#FF6B00',
    },
  };
}

function mapDbTransaction(tx: DbTransaction & {
  category?: { id: string; key: string; label_fr: string; type: string; org_id: string };
  org_unit?: { id: string; name: string; type: string; org_id: string };
}): Transaction | null {
  if (!tx) return null;
  return {
    id: tx.id,
    orgId: tx.org_id,
    type: tx.type as 'INCOME' | 'EXPENSE',
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    status: tx.status as Transaction['status'],
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
    createdById: tx.created_by_id ?? '',
    approvedById: tx.approved_by_id ?? null,
    approvedAt: tx.approved_at,
    categoryId: tx.category_id,
    orgUnitId: tx.org_unit_id,
    compensatesFor: tx.compensates_for,
    comment: tx.comment,
    version: tx.version,
    category: tx.category ? {
      id: tx.category.id,
      key: tx.category.key,
      labelFr: tx.category.label_fr,
      type: tx.category.type as 'INCOME' | 'EXPENSE',
      orgId: tx.category.org_id,
    } : undefined,
    orgUnit: tx.org_unit ? {
      id: tx.org_unit.id,
      name: tx.org_unit.name,
      type: tx.org_unit.type,
      orgId: tx.org_unit.org_id,
    } : undefined,
  };
}

function mapDbCategory(cat: DbCategory): Category {
  return {
    id: cat.id,
    key: cat.key,
    labelFr: cat.label_fr,
    type: cat.type as 'INCOME' | 'EXPENSE',
    orgId: cat.org_id,
  };
}

function mapDbOrgUnit(ou: DbOrgUnit): OrgUnit {
  return { id: ou.id, name: ou.name, type: ou.type, orgId: ou.org_id };
}

function mapDbAuditEntry(entry: DbAuditEntry): AuditEntry {
  return {
    id: entry.id,
    orgId: entry.org_id,
    transactionId: entry.transaction_id,
    userId: entry.user_id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    comment: entry.comment,
    createdAt: entry.created_at,
  };
}

// ─── Store ─────────────────────────────────────────────────────

interface AppState {
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  syncStatus: 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
}

interface StoreActions {
  setUser: (user: User | null) => void;
  addTransaction: (tx: { type: string; amount: number; description: string; date: string; categoryId: string; orgUnitId?: string; status: string }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string, comment: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

export const useSupabaseStore = create<AppState & StoreActions>((set, get) => ({
  user: null,
  transactions: [],
  categories: [],
  orgUnits: [],
  auditEntries: [],
  isLoading: true,
  error: null,
  syncStatus: 'syncing',
  lastSyncedAt: null,

  setUser: (user) => set({ user }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  refreshData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [txRes, catRes, ouRes, auditRes] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(*), org_unit:org_units(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('id'),
        supabase.from('org_units').select('*').order('id'),
        supabase.from('audit_entries').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (txRes.error) throw txRes.error;
      if (catRes.error) console.warn('[store] categories load error', catRes.error);
      if (ouRes.error) console.warn('[store] org_units load error', ouRes.error);
      if (auditRes.error) console.warn('[store] audit load error', auditRes.error);

      const transactions = (txRes.data ?? []).map(mapDbTransaction).filter(Boolean) as Transaction[];
      const categories = (catRes.data ?? []).map(mapDbCategory);
      const orgUnits = (ouRes.data ?? []).map(mapDbOrgUnit);
      const auditEntries = (auditRes.data ?? []).map(mapDbAuditEntry);

      set({
        transactions,
        categories,
        orgUnits,
        auditEntries,
        isLoading: false,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err) {
      set({ error: String(err), isLoading: false, syncStatus: 'error' });
    }
  },

  addTransaction: async (tx) => {
    set({ syncStatus: 'syncing' });
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        org_id: 'org-1',
        type: tx.type,
        amount: Math.round(tx.amount),
        description: tx.description,
        date: tx.date,
        status: tx.status,
        category_id: tx.categoryId,
        org_unit_id: tx.orgUnitId ?? null,
        compensates_for: null,
        comment: null,
        version: 1,
        created_by_id: get().user?.id ?? null,
      })
      .select('*, category:categories(*), org_unit:org_units(*)')
      .single();

    if (error) {
      set({ error: error.message, syncStatus: 'error' });
      return;
    }

    const mapped = mapDbTransaction(data as any);
    if (mapped) {
      set(s => ({
        transactions: [mapped, ...s.transactions],
        error: null,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      }));
    }
  },

  updateTransaction: async (id, updates) => {
    set({ syncStatus: 'syncing' });
    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        version: (updates.version ?? 1) + 1,
      })
      .eq('id', id)
      .select('*, category:categories(*), org_unit:org_units(*)')
      .single();

    if (error) {
      set({ error: error.message, syncStatus: 'error' });
      return;
    }

    const mapped = mapDbTransaction(data as any);
    if (mapped) {
      set(s => ({
        transactions: s.transactions.map(t => t.id === id ? mapped : t),
        error: null,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      }));
    }
  },

  approveTransaction: async (id) => {
    set({ syncStatus: 'syncing' });
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'APPROVED',
        approved_by_id: get().user?.id ?? null,
        approved_at: now,
        updated_at: now,
        version: 2,
      })
      .eq('id', id)
      .select('*, category:categories(*), org_unit:org_units(*)')
      .single();

    if (error) {
      set({ error: error.message, syncStatus: 'error' });
      return;
    }

    const mapped = mapDbTransaction(data as any);
    if (mapped) {
      set(s => ({
        transactions: s.transactions.map(t => t.id === id ? mapped : t),
        error: null,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      }));
    }
  },

  rejectTransaction: async (id, comment) => {
    set({ syncStatus: 'syncing' });
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'REJECTED',
        comment,
        updated_at: new Date().toISOString(),
        version: 2,
      })
      .eq('id', id)
      .select('*, category:categories(*), org_unit:org_units(*)')
      .single();

    if (error) {
      set({ error: error.message, syncStatus: 'error' });
      return;
    }

    const mapped = mapDbTransaction(data as any);
    if (mapped) {
      set(s => ({
        transactions: s.transactions.map(t => t.id === id ? mapped : t),
        error: null,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      }));
    }
  },

  deleteTransaction: async (id) => {
    set({ syncStatus: 'syncing' });
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) {
      set({ error: error.message, syncStatus: 'error' });
      return;
    }

    set(s => ({
      transactions: s.transactions.filter(t => t.id !== id),
      error: null,
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    }));
  },
}));

// ─── Authorization helpers ─────────────────────────────────────

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

// ─── Realtime subscription ─────────────────────────────────────

export function useRealtimeSync() {
  const setSyncStatus = useSupabaseStore.getState().setSyncStatus;

  if (typeof window === 'undefined') return;

  const channel = supabase.channel('lumina-realtime');

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
      console.log('[realtime] transactions change:', payload.eventType);
      setSyncStatus('syncing');
      // Refresh the full list — simplest approach for church app
      get().refreshData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
      setSyncStatus('syncing');
      get().refreshData();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'org_units' }, () => {
      setSyncStatus('syncing');
      get().refreshData();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_entries' }, (payload) => {
      console.log('[realtime] audit entry:', payload.new);
      // Append new audit entry without full refresh
      const entry = mapDbAuditEntry(payload.new as any);
      if (entry) {
        set(s => ({ auditEntries: [entry, ...s.auditEntries] }));
      }
      setSyncStatus('synced');
    })
    .subscribe((status) => {
      console.log('[realtime] subscription status:', status);
      if (status === 'SUBSCRIBED') setSyncStatus('synced');
      if (status === 'CHANNEL_ERROR') setSyncStatus('error');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
