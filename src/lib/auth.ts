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

// Use environment variables — never hardcode credentials.
// L'application exige explicitement VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// (plus de fallback silencieux vers le projet de dev).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes : l'authentification ne peut pas fonctionner sans Supabase.",
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // PKCE : le client stocke le code_verifier et l'échange contre une
      // session. Sans ça, flowType reste "implicit" par défaut et
      // exchangeCodeForSession (utilisé au callback /auth/callback) échoue.
      flowType: "pkce",
      // Persiste la session (localStorage) pour « Mes comptes ».
      persistSession: true,
      // Auto-détecte les tokens dans l'URL au rechargement.
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
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

// Brand-new sign-up window. A Google OAuth round-trip that just created the
// auth user (user.created_at within this window) is the user's FIRST login —
// i.e. a sign-up — so it must land on onboarding. A returning login (account
// created minutes/hours/days ago) is a connection and may go straight to the
// dashboard. The window is a few minutes: long enough to cover a slow OAuth
// redirect, short enough that a re-login after finishing onboarding is no
// longer "new".
const NEW_SIGNUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * True when the auth user was created within NEW_SIGNUP_WINDOW_MS — i.e. this
 * session is a first-time login (sign-up) rather than a returning connection.
 * Used to force onboarding for brand-new Google accounts.
 */
function isBrandNewUser(user: SupabaseUser | null | undefined): boolean {
  if (!user?.created_at) return false;
  const created = new Date(user.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= NEW_SIGNUP_WINDOW_MS;
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
  //
  // RÉSILIENT : si `upsert_profile` échoue (trigger `handle_new_user`
  // inopérant, RLS, org_id = 'no-org'…), on ne fait pas échouer le
  // sign-in/sign-up : Supabase a bien créé l'utilisateur et la session,
  // on construit un profil local minimal pour laisser l'app démarrer, et
  // on logue l'erreur pour diagnostic. Le rôle réel sera résolu pendant
  // l'onboarding (creator) ou par invitation claim (member).
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
      // Le trigger a peut-être déjà créé la ligne mais le RPC a échoué
      // (RLS sur la lecture, ou le claim organization-id = 'no-org').
      // On tente une lecture directe du profil pour ne pas bloquer.
      const fallback = await this.getProfile(user.id);
      if (fallback) return fallback;

      // Profil minimal local — garantit que l'app peut démarrer même si
      // la table profiles n'a pas pu être créée. Le rôle est résolu plus
      // tard ; on ne bloque jamais l'auth pour ça.
      console.warn(
        "[auth] ensureProfile: upsert_profile a échoué, profil local minimal:",
        error?.message ?? "RPC sans donnée",
      );
      return {
        id: user.id,
        email: user.email ?? null,
        first_name: user.user_metadata?.first_name ?? null,
        last_name: user.user_metadata?.last_name ?? null,
        role: "MEMBRE",
        org_id: getOrganizationId(),
        created_at: user.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
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
      } else {
        // Fallback : Supabase n'a pas retourné de session immédiate (ex.
        // "Confirm email" encore actif, ou confirmation expirée sur un
        // compte créé plus tôt). On tente une connexion directe par
        // email + mot de passe : si le compte est confirmé (ce qui est le
        // cas par défaut — tous les comptes du projet sont confirmés
        // instantanément), la session se crée et l'utilisateur avance.
        // Si la confirmation est encore requise, on informe clairement
        // plutôt que de bloquer silencieusement sur le formulaire.
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
        if (loginError) {
          const msg =
            /email not confirmed|confirm/i.test(loginError.message)
              ? "Veuillez confirmer votre adresse e-mail avant de continuer (un lien de confirmation a été envoyé)."
              : "Inscription effectuée — veuillez vérifier votre boîte de réception et confirmer votre adresse, puis connectez-vous.";
          this.setState({ error: msg, isLoading: false });
          return { error: msg };
        }
        if (loginData.session && loginData.user) {
          const profile = await this.ensureProfile(loginData.user);
          this.setState({
            session: loginData.session,
            user: loginData.user,
            profile,
            isLoading: false,
          });
          this.startSessionValidation();
          this.notifyListeners();
        }
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
  //
  // Web : redirection pleine page. Le SDK (flowType: "pkce") génère le
  // code_verifier et le code_challenge automatiquement, les stocke dans
  // localStorage, puis redirige vers l'URL GoTrue d'autorisation. Au
  // retour, GoTrue redirige vers `redirectTo` (window.location.origin +
  // "/auth/callback") avec `?code=…&state=…`. La page /auth/callback
  // appelle handleOAuthCallback → exchangeCodeForSession.
  //
  // IMPORTANT : l'URL de callback web doit figurer dans la liste des
  // Redirect URLs du projet Supabase (dashboard → Authentication → URL
  // Configuration → Redirect URLs). Pour les previews Autonoma, ajouter :
  //   https://*.preview.autonoma.app/auth/callback
  // La Site URL doit correspondre au domaine courant (ou être un wildcard).
  //
  // Mobile (Capacitor) : deep link système lumina://auth/callback.

  async signInWithGoogle(): Promise<{ error: string | null }> {
    this.setState({ isLoading: true, error: null });

    try {
      // PKCE : le client (flowType: "pkce") génère le code_verifier et le
      // code_challenge automatiquement, et les stocke dans localStorage
      // pour l'échange final au callback. Rien à calculer ici.

      const isNative = Capacitor.isNativePlatform();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Web : /auth/callback sur le domaine courant.
          // Mobile : deep link lumina://auth/callback (capturé par le
          // intent-filter AndroidManifest).
          redirectTo: isNative
            ? "lumina://auth/callback"
            : window.location.origin + "/auth/callback",
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
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

      // La redirection est lancée (web : page entière, mobile : system
      // browser). Le reste est géré par handleOAuthCallback (web) ou
      // handleOAuthDeepLink (mobile).
      return { error: null };
    } catch (err: any) {
      const userMessage =
        err?.message || "An unexpected error occurred during Google sign-in.";
      this.setState({ error: userMessage, isLoading: false });
      return { userMessage };
    }
  }

  // Handle OAuth callback (for web)
  async handleOAuthCallback(): Promise<{
    error: string | null;
    profile: Profile | null;
    isNewUser: boolean;
  }> {
    this.setState({ isLoading: true, error: null });

    try {
      // PKCE callback : Supabase redirige vers /auth/callback?code=...&state=...
      // avec un `code` à échanger contre une session. On ne peut PAS s'en
      // tenir à `getSession()` : le cookie d'auth est HTTP-only et peut ne
      // pas être disponible (ex. PWA, service worker, sandbox de preview),
      // ce qui laisse `session = null` alors que le `code` est bien présent.
      const code = new URLSearchParams(window.location.search).get("code");
      let session: Session | null = null;

      if (code) {
        // Échange le code OAuth contre une vraie session — ça marche même
        // quand le cookie n'est pas accessible.
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const errorMsg = `OAuth callback failed: ${exchangeError.message}`;
          this.setState({ error: errorMsg, isLoading: false });
          return { error: errorMsg, profile: null, isNewUser: false };
        }
        session = data.session;
      }

      // Fallback : si pas de `code` dans l'URL, on tente la session existante
      // (ex. redirigé après déconnexion, ou code déjà consommé).
      if (!session) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          const errorMsg =
            sessionError?.message ||
            "No session found after OAuth callback. Le code d'authentification a peut-être expiré ou été consommé.";
          this.setState({ error: errorMsg, isLoading: false });
          return { error: errorMsg, profile: null, isNewUser: false };
        }
        session = data.session;
      }

      // Validate session has required fields
      if (!session.user?.id) {
        const errorMsg = "Invalid session: user ID is missing.";
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null, isNewUser: false };
      }

      // Validate access token is present
      if (!session.access_token) {
        const errorMsg = "Invalid session: access token is missing.";
        this.setState({ error: errorMsg, isLoading: false });
        return { error: errorMsg, profile: null, isNewUser: false };
      }

      // Nettoyer l'URL de paramètres OAuth (code, state) pour ne pas les
      // laisser dans la barre d'adresse ni les réexposer au rechargement.
      if (window.location.search) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, "", cleanUrl);
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
        return {
          error: null,
          profile: newProfile,
          isNewUser: isBrandNewUser(session.user),
        };
      }

      this.setState({
        session,
        user: session.user,
        profile: profile,
        isLoading: false,
      });
      this.startSessionValidation();
      this.notifyListeners();

      return {
        error: null,
        profile,
        isNewUser: isBrandNewUser(session.user),
      };
    } catch (err: any) {
      const userMessage =
        err?.message || "An unexpected error occurred during OAuth callback.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage, profile: null, isNewUser: false };
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
    isNewUser: boolean;
  }> {
    if (!url) {
      this.setState({ isLoading: false, error: null });
      return { error: null, profile: null, isNewUser: false };
    }

    this.setState({ isLoading: true, error: null });

    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (!code) {
        // Not an OAuth callback (e.g. the app's own lumina:// launch URL).
        this.setState({ isLoading: false, error: null });
        return { error: null, profile: null, isNewUser: false };
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const userMessage =
          "Google sign-in could not be completed. Please try again.";
        this.setState({ error: userMessage, isLoading: false });
        return { error: userMessage, profile: null, isNewUser: false };
      }

      const session = data.session;
      if (!session?.user) {
        this.setState({ isLoading: false, error: null });
        return { error: null, profile: null, isNewUser: false };
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
      return {
        error: null,
        profile,
        isNewUser: isBrandNewUser(session.user),
      };
    } catch (err: any) {
      const userMessage =
        err?.message || "An unexpected error occurred during Google sign-in.";
      this.setState({ error: userMessage, isLoading: false });
      return { error: userMessage, profile: null, isNewUser: false };
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
