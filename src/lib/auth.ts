/**
 * Authentication Service for Lumina
 * Handles Supabase auth (email/password + Google OAuth)
 * Integrates with OneSignal for push notifications
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { Role } from '@/types';
import { getOrganizationId } from './orgContext';

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

// Token expiry buffer (renew 5 minutes before expiry)
const TOKEN_RENEWAL_BUFFER_MS = 5 * 60 * 1000;

// Session validation interval (check every 60 seconds)
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;

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
  private sessionCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isInitializing = false;

  // Validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength (min 6 characters)
  private isValidPassword(password: string): boolean {
    return password.length >= 6;
  }

  // Check if session token is expired or expiring soon
  private isSessionExpiredOrExpiring(session: Session): boolean {
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    return expiresAt === 0 || expiresAt - now < TOKEN_RENEWAL_BUFFER_MS;
  }

  // Start periodic session validation
  private startSessionValidation(): void {
    if (this.sessionCheckTimer) return;
    this.sessionCheckTimer = setInterval(async () => {
      await this.validateCurrentSession();
    }, SESSION_CHECK_INTERVAL_MS);
  }

  // Stop periodic session validation
  private stopSessionValidation(): void {
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }
  }

  // Validate current session and refresh if needed
  private async validateCurrentSession(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && this.isSessionExpiredOrExpiring(session)) {
        const { error } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
        if (error) {
          console.error('[Auth] Session refresh failed:', error);
          this.handleSessionInvalidated();
        }
      }
    } catch (err) {
      console.error('[Auth] Session validation error:', err);
    }
  }

  // Handle session invalidation (expired or revoked)
  private async handleSessionInvalidated(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Auth] Error during session invalidation:', err);
    }
    this.setState({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      error: 'Session expired. Please sign in again.',
    });
    this.notifyListeners();
  }

  // Get current session with validation
  async getSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[Auth] Error getting session:', error);
        return null;
      }
      return session;
    } catch (err) {
      console.error('[Auth] Exception getting session:', err);
      return null;
    }
  }

  // Get current user with fresh metadata
  async getUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('[Auth] Error getting user:', error);
        return null;
      }
      return user;
    } catch (err) {
      console.error('[Auth] Exception getting user:', err);
      return null;
    }
  }

  // Fetch fresh user data (refreshes metadata)
  async fetchUser(): Promise<SupabaseUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('[Auth] Error fetching user:', error);
        return null;
      }
      this.setState({ user });
      this.notifyListeners();
      return user;
    } catch (err) {
      console.error('[Auth] Exception fetching user:', err);
      return null;
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    try {
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
    } catch (err) {
      console.error('[Auth] Exception fetching profile:', err);
      return null;
    }
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
      org_id: getOrganizationId(),
      updated_at: new Date().toISOString(),
    };

    try {
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
    } catch (err) {
      console.error('[Auth] Exception upserting profile:', err);
      throw err;
    }
  }

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    // Input validation
    if (!email || !this.isValidEmail(email)) {
      const errorMsg = 'Please enter a valid email address.';
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!password || !this.isValidPassword(password)) {
      const errorMsg = 'Password must be at least 6 characters long.';
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Map Supabase error codes to user-friendly messages
        let userMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please confirm your email address before signing in.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait and try again.';
        } else if (error.message.includes('User not found')) {
          userMessage = 'No account found with this email address.';
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      if (data.user) {
        const profile = await this.upsertProfile(data.user, 'TREASURIER');
        this.setState({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
        });
        this.startSessionValidation();
        this.notifyListeners();
      }

      return { error: null };
    } catch (err: any) {
      const userMessage = err?.message || 'An unexpected error occurred during sign in.';
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
    }
  }

  // Sign up with email and password (no email confirmation)
  async signUpWithEmail(email: string, password: string, firstName: string, lastName: string, role: Role): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    // Input validation
    if (!email || !this.isValidEmail(email)) {
      const errorMsg = 'Please enter a valid email address.';
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!password || !this.isValidPassword(password)) {
      const errorMsg = 'Password must be at least 6 characters long.';
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!firstName || firstName.trim().length === 0) {
      const errorMsg = 'Please enter your first name.';
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: role,
          },
        },
      });

      if (error) {
        // Map Supabase error codes to user-friendly messages
        let userMessage = error.message;
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('weak')) {
          userMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.message.includes('invalid email')) {
          userMessage = 'Please enter a valid email address.';
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      if (data.user) {
        const profile = await this.upsertProfile(data.user, role);
        this.setState({
          session: data.session,
          user: data.user,
          profile,
          isLoading: false,
        });
        this.startSessionValidation();
        this.notifyListeners();
      }

      return { error: null };
    } catch (err: any) {
      const userMessage = err?.message || 'An unexpected error occurred during sign up.';
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
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
          // Request additional scopes for profile data
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        let userMessage = error.message;
        if (error.message.includes('redirect_uri')) {
          userMessage = 'Invalid OAuth redirect configuration. Please contact support.';
        } else if (error.message.includes('access_denied')) {
          userMessage = 'Google sign-in was denied. Please try again.';
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      // The redirect will handle the rest
      return { error: null };
    } catch (err: any) {
      const userMessage = err?.message || 'An unexpected error occurred during Google sign-in.';
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
    }
  }

  // Handle OAuth callback (for web)
  async handleOAuthCallback(): Promise<{ error: string | null; profile: Profile | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const errorMsg = sessionError?.message || 'No session found after OAuth callback.';
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      // Validate session has required fields
      if (!session.user?.id) {
        const errorMsg = 'Invalid session: user ID is missing.';
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      // Validate access token is present
      if (!session.access_token) {
        const errorMsg = 'Invalid session: access token is missing.';
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      const profile = await this.getProfile(session.user.id);

      // If profile doesn't exist, this might be a new OAuth user - create it
      if (!profile) {
        const newProfile = await this.upsertProfile(session.user, 'TREASURIER');
        this.setState({
          session,
          user: session.user,
          profile: newProfile,
          isLoading: false,
        });
        this.startSessionValidation();
        this.notifyListeners();
        return { error: null, profile: newProfile };
      }

      this.setState({
        session,
        user: session.user,
        profile: profile,
        isLoading: false,
      });
      this.startSessionValidation();
      this.notifyListeners();

      return { error: null, profile };
    } catch (err: any) {
      const userMessage = err?.message || 'An unexpected error occurred during OAuth callback.';
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage, profile: null };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    this.stopSessionValidation();

    try {
      const { error } = await supabase.auth.signOut();

      this.setState({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      });
      this.notifyListeners();

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: any) {
      // Still clear state even if signOut fails
      this.setState({
        session: null,
        user: null,
        profile: null,
        isLoading: false,
        error: err?.message || null,
      });
      this.notifyListeners();
      return { error: err?.message };
    }
  }

  // Update profile
  async updateProfile(updates: Partial<Pick<Profile, 'first_name' | 'last_name' | 'role'>>): Promise<{ error: string | null }> {
    if (!this.state.user) {
      return { error: 'No user logged in' };
    }

    // Validate inputs
    if (updates.first_name !== undefined && updates.first_name.trim().length === 0) {
      return { error: 'First name cannot be empty.' };
    }
    if (updates.role !== undefined) {
      const validRoles = ['PASTEUR_PRINCIPAL', 'PASTEUR_ASSOCIE', 'PASTEUR_JEUNESSE', 'ANCIEN', 'DIACRE',
        'RESPONSABLE_DEPARTEMENT', 'SECRETAIRE', 'SECRETAIRE_ADJOINT', 'TREASURIER',
        'TREASURIER_ADJOINT', 'COMPTABLE', 'RESPONSABLE_GROUPE', 'BENEVOLE', 'MEMBRE'];
      if (!validRoles.includes(updates.role)) {
        return { error: 'Invalid role specified.' };
      }
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
      return { error: err?.message };
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.state.session !== null && this.state.user !== null;
  }

  // Check if current session is valid and not expired
  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;
    return !this.isSessionExpiredOrExpiring(session);
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
        this.stopSessionValidation();
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
