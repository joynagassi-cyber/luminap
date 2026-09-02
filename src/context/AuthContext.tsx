import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as DbUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { useSupabaseStore } from '@/store/useSupabaseStore';
import { mapDbProfileToUser } from '@/store/useSupabaseStore';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useSupabaseStore(s => s.setUser);
  const refreshData = useSupabaseStore(s => s.refreshData);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionUser = async (dbUser: DbUser) => {
    try {
      // Fetch profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', dbUser.id)
        .single();

      if (error) {
        console.error('[auth] profile fetch error', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const user = mapDbProfileToUser({ ...dbUser, ...profile });
      setUser(user);
      await refreshData();
      setIsLoading(false);
    } catch (err) {
      console.error('[auth] handleSessionUser error', err);
      setUser(null);
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  };

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
        },
      });
      if (error) return { ok: false, error: error.message };
      
      // If no user returned (email confirmation required), still ok
      if (data.user) {
        await handleSessionUser(data.user);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user: useSupabaseStore(s => s.user), isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
