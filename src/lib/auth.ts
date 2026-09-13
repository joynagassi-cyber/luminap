/**
 * Authentication Service for Lumina
 * Handles Supabase auth (email/password + Google OAuth)
 * Integrates with OneSignal for push notifications
 */

import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import type {
  SupabaseClient,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import type { Role } from "@/types";
import { getOrganizationId } from "./orgContext";

// Use environment variables — never hardcode credentials
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);

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

  // Validate password strength (min 8 characters)
  private isValidPassword(password: string): boolean {
    return password.length >= 8;
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && this.isSessionExpiredOrExpiring(session)) {
        const { error } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token,
        });
        if (error) {
          this.handleSessionInvalidated();
        }
      }
    } catch (err) {
      // Session validation failure - will retry on next check
    }
  }

  // Handle session invalidation (expired or revoked)
  private async handleSessionInvalidated(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Sign-out failure is non-fatal; state is cleared below
    }
    this.setState({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      error: "Session expired. Please sign in again.",
    });
    this.notifyListeners();
  }

  // Get current session with validation
  async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        return null;
      }
      return session;
    } catch (err) {
      return null;
    }
  }

  // Get current user with fresh metadata
  async getUser(): Promise<SupabaseUser | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        return null;
      }
      return user;
    } catch (err) {
      return null;
    }
  }

  // Fetch fresh user data (refreshes metadata)
  async fetchUser(): Promise<SupabaseUser | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        return null;
      }
      this.setState({ user });
      this.notifyListeners();
      return user;
    } catch (err) {
      return null;
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return null;
      }
      return data as Profile;
    } catch (err) {
      return null;
    }
  }

  // Read the profile the trigger already created, or create it on demand
  // (RPC without forcing a role). Never called with a forced role — that
  // path lives in `setProfileRole` so sign-in doesn't clobber the user's
  // role that an inviter/creator may have assigned.
  async ensureProfile(user: SupabaseUser): Promise<Profile> {
    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    const { data, error } = await supabase.rpc("upsert_profile", {
      p_user_id: user.id,
      p_first_name: user.user_metadata?.first_name ?? null,
      p_last_name: user.user_metadata?.last_name ?? null,
      p_org_id: getOrganizationId(),
    });
    if (error || !data) {
      throw error ?? new Error("Unable to resolve user profile");
    }
    return data as Profile;
  }

  // Persist the role chosen during onboarding / settings. Uses the
  // SECURITY DEFINER RPC, guarded on the server side by p_user_id = auth.uid().
  async setProfileRole(user: SupabaseUser, role: Role): Promise<Profile> {
    const { data, error } = await supabase.rpc("upsert_profile", {
      p_user_id: user.id,
      p_role: role,
      p_org_id: getOrganizationId(),
    });
    if (error || !data) {
      throw error ?? new Error("Unable to update user role");
    }
    return data as Profile;
  }

  // Sign in with email and password
  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    // Input validation
    if (!email || !this.isValidEmail(email)) {
      const errorMsg = "Please enter a valid email address.";
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!password || !this.isValidPassword(password)) {
      const errorMsg = "Password must be at least 8 characters long.";
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
        if (error.message.includes("Invalid login credentials")) {
          userMessage = "Invalid email or password.";
        } else if (error.message.includes("Email not confirmed")) {
          userMessage = "Please confirm your email address before signing in.";
        } else if (error.message.includes("Too many requests")) {
          userMessage = "Too many login attempts. Please wait and try again.";
        } else if (error.message.includes("User not found")) {
          userMessage = "No account found with this email address.";
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      if (data.user) {
        // Profile row already exists (server trigger). Read it — no forced
        // role; the effective role is resolved during onboarding / claim.
        const profile = await this.ensureProfile(data.user);
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
      const userMessage =
        err?.message || "An unexpected error occurred during sign in.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
    }
  }

  // Sign up with email and password (no email confirmation).
  // `role` is optional and NOT part of the sign-up form: the sign-up flow
  // never asks for a role. It is kept only for legacy/test compatibility;
  // when omitted the server trigger assigns the default role and the real
  // role is resolved later during onboarding / invitation claim.
  async signUpWithEmail(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: Role,
  ): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    // Input validation
    if (!email || !this.isValidEmail(email)) {
      const errorMsg = "Please enter a valid email address.";
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!password || !this.isValidPassword(password)) {
      const errorMsg = "Password must be at least 8 characters long.";
      this.setState({ error: errorMsg, isLoading: false });
      return { error: errorMsg };
    }

    if (!firstName || firstName.trim().length === 0) {
      const errorMsg = "Please enter your first name.";
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
            // Only carried when a legacy caller supplied one; the form never
            // sets a role at sign-up.
            ...(role ? { role } : {}),
          },
        },
      });

      if (error) {
        // Map Supabase error codes to user-friendly messages
        let userMessage = error.message;
        if (
          error.message.includes("already registered") ||
          error.message.includes("User already registered")
        ) {
          userMessage =
            "An account with this email already exists. Please sign in instead.";
        } else if (error.message.includes("weak")) {
          userMessage = "Password is too weak. Please use a stronger password.";
        } else if (error.message.includes("invalid email")) {
          userMessage = "Please enter a valid email address.";
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      if (data.user) {
        // No forced role at sign-up. The server trigger `handle_new_user`
        // already created the profile (default role) when the auth user was
        // inserted; read it back here. The effective role is resolved later
        // during onboarding (creator) or by invitation claim (member).
        const profile = await this.ensureProfile(data.user);
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
      const userMessage =
        err?.message || "An unexpected error occurred during sign up.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
    }
  }

  // Sign in with Google OAuth
  async signInWithGoogle(): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      // Generate a true PKCE pair (RFC 7636):
      //   code_verifier  — 64 random ASCII chars
      //   code_challenge — base64url( SHA-256(code_verifier) ), no padding
      // We can't store the verifier for the round-trip (Supabase signs us back
      // at `redirectTo` without it), so the verifier is ephemeral and the
      // challenge is all we send to Google; on the callback Supabase holds
      // the secret side and validates it server-side.
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const codeVerifier = btoa(
        String.fromCharCode(...randomBytes),
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(codeVerifier),
      );
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
          // Native: use our custom `lumina://` scheme so Google hands the
          // user back into the app instead of the system browser.
          // `Capacitor.isNativePlatform()` is the authoritative check — it
          // reads the `window.Capacitor` bridge object that Capacitor injects
          // into the WebView at load time.
          ...(Capacitor.isNativePlatform()
            ? { redirectTo: "lumina://auth/callback" }
            : {}),
          // PKCE flow (mobile / native) — no client secret on the client.
          // Supabase Auth holds the Web client secret server-side and
          // validates the code_challenge on exchange.
          queryParams: {
            access_type: "offline",
            prompt: "consent",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            // `state` is forwarded by Supabase back on the redirect URI so
            // `exchangeCodeForSession` can verify the callback is one the app
            // initiated.
            state: "lumina",
          },
        },
      });

      if (error) {
        let userMessage = error.message;
        if (error.message.includes("redirect_uri")) {
          userMessage =
            "Invalid OAuth redirect configuration. Please contact support.";
        } else if (error.message.includes("access_denied")) {
          userMessage = "Google sign-in was denied. Please try again.";
        }

        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage };
      }

      // The redirect will handle the rest
      return { error: null };
    } catch (err: any) {
      const userMessage =
        err?.message || "An unexpected error occurred during Google sign-in.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage };
    }
  }

  // Handle OAuth callback (for web)
  async handleOAuthCallback(): Promise<{
    error: string | null;
    profile: Profile | null;
  }> {
    this.setState({ isLoading: true, error: null });

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const errorMsg =
          sessionError?.message || "No session found after OAuth callback.";
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      // Validate session has required fields
      if (!session.user?.id) {
        const errorMsg = "Invalid session: user ID is missing.";
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      // Validate access token is present
      if (!session.access_token) {
        const errorMsg = "Invalid session: access token is missing.";
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null };
      }

      const profile = await this.getProfile(session.user.id);

      // The server trigger already created the profile for this user; read it
      // back. Only create on demand if it is genuinely missing (legacy rows).
      if (!profile) {
        const newProfile = await this.ensureProfile(session.user);
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
      const userMessage =
        err?.message || "An unexpected error occurred during OAuth callback.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage, profile: null };
    }
  }

  /**
   * Native OAuth finalization.
   *
   * On Capacitor (Android/iOS) `signInWithGoogle()` opens Google in the
   * system browser / WebView with `redirectTo = "lumina://auth/callback"`.
   * Google hands the user back to our app via that scheme (captured by the
   * `lumina://` intent-filter in AndroidManifest.xml). The URL carries the
   * OAuth `code` (or a Supabase PKCE `state`). This method exchanges it for
   * a real session so the sign-in "holds" inside the app instead of dropping
   * into the browser. No-op-safe on the web where the browser callback path
   * already handles it.
   */
  async handleOAuthDeepLink(url: string | null | undefined): Promise<{
    error: string | null;
    profile: Profile | null;
  }> {
    if (!url) {
      this.setState({ isLoading: false, error: null });
      return { error: null, profile: null };
    }

    this.setState({ isLoading: true, error: null });

    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (!code) {
        // Not an OAuth callback (e.g. the app's own lumina:// launch URL).
        this.setState({ isLoading: false, error: null });
        return { error: null, profile: null };
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const userMessage =
          "Google sign-in could not be completed. Please try again.";
        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage, profile: null };
      }

      const session = data.session;
      if (!session?.user) {
        this.setState({ isLoading: false, error: null });
        return { error: null, profile: null };
      }

      const profile = await this.ensureProfile(session.user);
      this.setState({
        session,
        user: session.user,
        profile,
        isLoading: false,
      });
      this.startSessionValidation();
      this.notifyListeners();
      return { error: null, profile };
    } catch (err: any) {
      const userMessage =
        err?.message || "An unexpected error occurred during Google sign-in.";
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
  async updateProfile(
    updates: Partial<Pick<Profile, "first_name" | "last_name" | "role">>,
  ): Promise<{ error: string | null }> {
    if (!this.state.user) {
      return { error: "No user logged in" };
    }

    // Validate inputs
    if (
      updates.first_name !== undefined &&
      updates.first_name.trim().length === 0
    ) {
      return { error: "First name cannot be empty." };
    }
    if (updates.role !== undefined) {
      const validRoles = [
        "PASTEUR_PRINCIPAL",
        "PASTEUR_ASSOCIE",
        "PASTEUR_JEUNESSE",
        "ANCIEN",
        "DIACRE",
        "RESPONSABLE_DEPARTEMENT",
        "SECRETAIRE",
        "SECRETAIRE_ADJOINT",
        "TREASURIER",
        "TREASURIER_ADJOINT",
        "COMPTABLE",
        "RESPONSABLE_GROUPE",
        "BENEVOLE",
        "MEMBRE",
      ];
      if (!validRoles.includes(updates.role)) {
        return { error: "Invalid role specified." };
      }
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.state.user.id);

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
    this.listeners.forEach((cb) => cb());
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export for React hooks
export function useAuth() {
  return authService;
}
