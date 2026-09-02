import { createContext, useContext, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { User, Transaction, Category, OrgUnit, AuditEntry } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  org: { id: string; name: string; type: string; accentColor: string };
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
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.ok && data.user) {
        setState(s => ({ ...s, user: data.user, isLoading: false }));
      } else {
        setState(s => ({ ...s, user: null, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  };

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      if (data.ok) {
        setState(s => ({
          ...s,
          categories: data.categories || [],
          orgUnits: data.orgUnits || [],
          transactions: data.transactions || [],
          auditEntries: data.auditEntries || [],
        }));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setState(s => ({ ...s, user: data.user, error: null, isLoading: false }));
        await loadData();
        return true;
      }
      setState(s => ({ ...s, error: data.statusMessage || 'Identifiants invalides', isLoading: false }));
      return false;
    } catch {
      setState(s => ({ ...s, error: 'Erreur de connexion', isLoading: false }));
      return false;
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string): Promise<boolean> => {
    // For now, signup is not available - use existing credentials
    setState(s => ({ ...s, error: 'Inscription désactivée. Utilisez les identifiants fournis.', isLoading: false }));
    return false;
  };

  const logout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
    setState(s => ({ ...s, user: null, transactions: [], categories: [], orgUnits: [], auditEntries: [] }));
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
