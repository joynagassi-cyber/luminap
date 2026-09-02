import { createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Transaction, Category, OrgUnit, AuditEntry } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

interface AppState {
  user: AuthUser | null;
  transactions: Transaction[];
  categories: Category[];
  orgUnits: OrgUnit[];
  auditEntries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    transactions: [],
    categories: [],
    orgUnits: [],
    auditEntries: [],
    isLoading: true,
    error: null,
  });

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      setState(s => ({ ...s, user: { id: session.user.id, email: session.user.email!, profile }, isLoading: false }));
    } else {
      setState(s => ({ ...s, user: null, isLoading: false }));
    }
  };

  const loadData = async () => {
    const [catsRes, orgsRes, txRes, auditRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('org_units').select('*'),
      supabase.from('transactions').select('*, category:categories(*), org_unit:org_units(*)').order('date', { ascending: false }),
      supabase.from('audit_entries').select('*').order('created_at', { ascending: false }),
    ]);

    setState(s => ({
      ...s,
      categories: catsRes.data || [],
      orgUnits: orgsRes.data || [],
      transactions: txRes.data || [],
      auditEntries: auditRes.data || [],
      error: catsRes.error?.message || orgsRes.error?.message || txRes.error?.message || auditRes.error?.message || null,
    }));
  };

  useEffect(() => {
    loadUser();
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { data: profile } = supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        profile.then(({ data }) => {
          setState(s => ({ ...s, user: { id: session!.user.id, email: session!.user.email!, profile: data } }));
          loadData();
        });
      } else {
        setState(s => ({ ...s, user: null }));
      }
    });
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setState(s => ({ ...s, error: error?.message || 'Identifiants invalides' }));
      return false;
    }
    await loadUser();
    return true;
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName } } });
    if (error || !data.user) {
      setState(s => ({ ...s, error: error?.message || 'Échec de l\'inscription' }));
      return false;
    }
    await loadUser();
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState(s => ({ ...s, user: null }));
  };

  const refreshData = () => loadData();

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, refreshData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
