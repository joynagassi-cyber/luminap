/**
 * Authentication Service for Lumina
 * Handles Supabase auth (email/password + Google OAuth)
 * Integrates with OneSignal for push notifications
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Role } from '@/types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hhgovvrnalibhgpakswi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Profile type from database
export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

// Auth state
interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

// Auth service class
class AuthService {
  private state: AuthState = {
    session: null,
    user: null,
    profile: null,
    isLoading: false,
    error: null,
  };

  private listeners: Set<() => void> = new Set();

  // Get current session
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // Get current user
  async getUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Auth] Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }

  // Create or update profile after auth
  async upsertProfile(user: SupabaseUser, role: Role): Promise<Profile> {
    const metadata = user.user_metadata || {};
    const profileData = {
      id: user.id,
      email: user.email,
      first_name: metadata.first_name || user.email?.split('@')[0] || 'Utilisateur',
      last_name: metadata.last_name || '',
      role: role,
      org_id: 'org-1',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[Auth] Error upserting profile:', error);
      throw error;
    }

    return data as Profile;
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.setState({ error: error.message, isLoading: false });
        return { error: error.message };
      }

      if (data.user) {
        const profile = await this.upsertProfile(data.user, 'TREASURIER');
        this.setState({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
        });
        this.notifyListeners();
      }

      return { error: null };
    } catch (err: any) {
      this.setState({ error: err.message, isLoading: false });
      return { error: err.message };
    }
  }

  // Sign up with email and password (no email confirmation)
  async signUpWithEmail(email: string, password: string, firstName: string, lastName: string, role: Role): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role,
          },
        },
      });

      if (error) {
        this.setState({ error: error.message, isLoading: false });
        return { error: error.message };
      }

      if (data.user) {
        const profile = await this.upsertProfile(data.user, role);
        this.setState({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
        });
        this.notifyListeners();
      }

      return { error: null };
    } catch (err: any) {
      this.setState({ error: err.message, isLoading: false });
      return { error: err.message };
    }
  }

  // Sign in with Google OAuth
  async signInWithGoogle(): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          // For mobile apps, use a custom URL scheme
          ...(typeof capacitor !== 'undefined' && (capacitor as any).isNativePlatform?.()
            ? { redirectTo: 'lumina://auth/callback' }
            : {}),
        },
      });

      if (error) {
        this.setState({ error: error.message, isLoading: false });
        return { error: error.message };
      }

      // The redirect will handle the rest
      return { error: null };
    } catch (err: any) {
      this.setState({ error: err.message, isLoading: false });
      return { error: err.message };
    }
  }

  // Handle OAuth callback (for web)
  async handleOAuthCallback(): Promise<{ error: string | null; profile: Profile | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        this.setState({ error: error?.message || 'No session found', isLoading: false });
        return { error: error?.message || 'No session found', profile: null };
      }

      const profile = await this.getProfile(session.user.id);
      this.setState({
        session,
        user: session.user,
        profile: profile || null,
        isLoading: false,
      });
      this.notifyListeners();

      return { error: null, profile };
    } catch (err: any) {
      this.setState({ error: err.message, isLoading: false });
      return { error: err.message, profile: null };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: error.message };
      }

      this.setState({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
      });
      this.notifyListeners();

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // Update profile
  async updateProfile(updates: Partial<Pick<Profile, 'first_name' | 'last_name' | 'role'>>): Promise<{ error: string | null }> {
    if (!this.state.user) {
      return { error: 'No user logged in' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.state.user.id);

      if (error) {
        return { error: error.message };
      }

      // Update local state
      if (this.state.profile) {
        this.setState({
          profile: { ...this.state.profile, ...updates },
        });
        this.notifyListeners();
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }

  // Get current state
  getState(): AuthState {
    return this.state;
  }

  // Subscribe to auth changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);

    // Also listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        this.setState({
          session,
          user: session.user,
          isLoading: false,
        });
      } else {
        this.setState({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
        });
      }
      this.notifyListeners();
    });

    return () => {
      this.listeners.delete(callback);
      subscription.unsubscribe();
    };
  }

  // Internal state setter
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for React hooks
export function useAuth() {
  return authService;
}
