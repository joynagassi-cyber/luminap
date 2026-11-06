import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import { authService, type Profile, demoLogin, DEMO_ORG_ID } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";
import type { Role } from "@/types";
import { needsOnboarding } from "@/lib/onboardingState";
import { readReturnToFromSearch } from "@/lib/routeResolver";
import { useLocalStore } from "@/store/useLocalStore";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { Loader2, Mail, Lock, User } from "lucide-react";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import GoogleButton from "@/components/GoogleButton";
import { Capacitor } from "@capacitor/core";
import {
  LUMINA_DEEPLINK_EVENT,
  type LuminaDeepLinkDetail,
} from "@/hooks/useAppUrlOpen";

type AuthMode = "login" | "signup";

/**
 * Garde-fou anti-spinner-infini (bug P1-5) : un appel d'authentification
 * qui ne répond pas (réseau coupé, service injoignable) laissait le
 * bouton principal tourner sans fin, sans message. Passé le délai, on
 * rend la main avec une erreur explicite ; l'appel d'origine peut
 * continuer en arrière-plan (PowerSync retryable).
 *
 * P2-10 (Android/iOS) : `useKeyboardAvoidance` ajuste le padding du
 * conteneur principal quand le clavier s'ouvre (ion-content ne suffit
 * pas toujours sur les formulaires imbriqués).
 *
 * P3-4 (OAuth/DeepLink) : le callback Google (web) ou l'URL lumina://
 * (natif) est géré par `authService.handleOAuthCallback()` puis
 * `proceedAfterAuth()`. La page se réinitialise ensuite.
 */
export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { config: appConfig } = useAppConfig();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<any>(null);

  // --- NOUVEAU : bouton démo DEV-only ---
  const handleDemoLogin = async () => {
    if (!import.meta.env.DEV) return;
    setLoading(true);
    setError("");
    const ok = demoLogin();
    if (ok) {
      // force le reload pour que l'app lise la session/profil
      window.location.reload();
    } else {
      setError("Mode démo indisponible (build prod)");
    }
    setLoading(false);
  };

  // Le bouton « Mes comptes » n'est visible QUE si des comptes ont déjà
  // été connectés dans ce navigateur (donc uniquement après une déconnexion).
  // On lit la clé Supabase JS (sessions persistées) au montage.
  const [hasPersistedSessions, setHasPersistedSessions] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb-hhgovvrnalibhgpakswi-auth-token");
      setHasPersistedSessions(!!raw);
    } catch {
      setHasPersistedSessions(false);
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      setAuthState(authService.getState());
    });
    return unsubscribe;
  }, []);

  /**
   * Once the session is established (email, signup or Google) we no longer
   * pick a role here. The role is resolved either by onboarding (creator
   * founds an org) or by invitation claim (member is granted the inviter's
   * role). If onboarding is already done, go straight to the dashboard;
   * otherwise land on the first onboarding screen.
   */
  const proceedAfterAuth = async (
    profile: Pick<Profile, "role" | "id"> | null | undefined,
    opts?: { forceOnboarding?: boolean },
  ) => {
    try {
      await loadInitialData();
    } catch (e) {
      // loadInitialData doit JAMAIS bloquer la navigation post-auth :
      // le fallback PowerSync est non critique (le store a déjà ses
      // données seed locales). On logue et on continue.
      console.warn("[auth] loadInitialData failed, continuing:", e);
    }
    try {
      await oneSignalService.login(
        (profile?.role ?? "MEMBRE") as Role,
        profile?.id ?? user?.id ?? "",
      );
    } catch (e) {
      // OneSignal non critique pour la navigation.
      console.warn("[auth] oneSignalService.login failed:", e);
    }
    // Une inscription (nouveau compte) passe TOUJOURS par la première page
    // (onboarding : accueil + config) — et non directement au dashboard
    // principal — même si ce navigateur a déjà configuré un autre compte.
    // La connexion d'un compte existant reste conditionnelle (onboarding
    // uniquement s'il n'est pas encore finalisé pour ce navigateur).
    //
    // R126 — si un `returnTo` allowlisté est présent (`/auth?returnTo=…`,
    // posé par le garde de route pour une route protégée), on y revient :
    // c'était la cible du lien/onglet d'origine. L'onboarding forcé reste
    // prioritaire (un nouveau compte doit d'abord créer son organisation).
    const returnTo = readReturnToFromSearch(location.search);
    const to =
      opts?.forceOnboarding || needsOnboarding()
        ? "/onboarding"
        : (returnTo ?? "/dashboard");
    navigate(to, { replace: true });
  };

  // Handle OAuth callback — one-shot par mount (useRef) pour éviter que
  // l'effet ne se re-exécute à chaque changement de user?.id (qui arrive
  // après proceedAfterAuth) et ne déclenche un 2e loadInitialData
  // concurrent avec Splash.tsx. Dépendance minimale : location.pathname.
  const callbackHandledRef = useRef(false);
  useEffect(() => {
    if (callbackHandledRef.current) return;
    if (location.pathname !== "/auth/callback") return;
    callbackHandledRef.current = true;
    const handleCallback = async () => {
      const result = await authService.handleOAuthCallback();
      if (result.error) {
        // Fallback : le callback a échoué (code expiré, consommé, ou
        // échange impossible). Ne pas rester bloqué sur un écran noir —
        // afficher le message d'erreur sur la page de login.
        //
        // IMPORTANT : on garde `loading = false` ici pour réactiver le
        // bouton Google (sinon il reste disabled à l'infini). Le user peut
        // retenter le flow OAuth, ce qui relance une redirection Google
        // complète et un nouvel échange PKCE — c'est la voie de sortie
        setError(result.error);
        setLoading(false);
        return;
      }
      // Succès : on passe à la suite (onboarding ou dashboard)
      void proceedAfterAuth(result.profile);
    };
    void handleCallback();
  }, [location.pathname]);

  // Listen to native deep link (Android/iOS) — le flux est identique au
  // callback web (code échangé → session → profil → proceedAfterAuth).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onNativeDeepLink = (
      evt: Event,
    ) => {
      const detail = (evt as CustomEvent<LuminaDeepLinkDetail>).detail;
      if (!detail) return;
      if (detail.error) {
        setError(detail.error);
        return;
      }
      if (detail.profile) {
        // Même règle que le callback web : inscription Google (nouveau
        // compte) → onboarding d'abord ; connexion existante → dashboard.
        void proceedAfterAuth(detail.profile, {
          forceOnboarding: detail.isNewUser,
        });
      }
    };

    window.addEventListener(LUMINA_DEEPLINK_EVENT, onNativeDeepLink);
    return () => {
      window.removeEventListener(LUMINA_DEEPLINK_EVENT, onNativeDeepLink);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await authService.signInWithGoogle();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Le callback est géré par le routeur (callbackHandledRef) ou le
      // deep link natif. On attend le résultat via `proceedAfterAuth` qui
      // sera déclenché par l'effet `location.pathname === "/auth/callback"`.
      // Ici, on ne fait rien d'autre : le flow se poursuit.
    } catch (e: any) {
      setError(e?.message ?? "Échec de la connexion Google");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authService.signInWithEmail(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Le profil est résolu par `proceedAfterAuth` (via le state)
      void proceedAfterAuth(result.profile);
    } catch (e: any) {
      setError(e?.message ?? "Échec de la connexion");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authService.signUpWithEmail(
        email,
        password,
        firstName,
        lastName,
        selectedRole,
      );
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Inscription réussie : on force l'onboarding (création org)
      void proceedAfterAuth(result.profile, { forceOnboarding: true });
    } catch (e: any) {
      setError(e?.message ?? "Échec de l'inscription");
      setLoading(false);
    }
  };

  // Handle role selection (signup only)
  const roles: Role[] = ["PASTEUR", "SECRETAIRE", "TREASURIER", "COMPTABLE", "TREASURIER_ADJOINT", "SECRETAIRE_ADJOINT"];
  const roleLabels: Record<Role, string> = {
    PASTEUR: "Pasteur",
    SECRETAIRE: "Secrétaire",
    TREASURIER: "Trésorier",
    COMPTABLE: "Comptable",
    TREASURIER_ADJOINT: "Trésorier Adjoint",
    SECRETAIRE_ADJOINT: "Secrétaire Adjoint",
  };

  // Keyboard avoidance (Android/iOS)
  const keyboardHeight = useKeyboardAvoidance();

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            <div className="flex items-center gap-4">
              {/* « Mes comptes » : visible uniquement après une déconnexion
                  (des sessions sont déjà persistées en local). */}\n              {hasPersistedSessions && (
                <button
                  type="button"
                  onClick={() => navigate("/sessions", { replace: true })}
                  className="text-accent text-xs font-medium flex items-center gap-1 active:opacity-70"
                  aria-label="Retour à mes comptes"
                >
                  ← Mes comptes
                </button>
              )}
              <div className="text-xs text-text-tertiary">
                {authState?.user ? "Connecté" : "Déconnecté"}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full pb-12" style={keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : undefined}>
            <h1 className="text-text-primary font-bold text-2xl mb-1">
              {mode === "login" ? "Bon retour" : "Créer un compte"}
            </h1>
            <p className="text-text-tertiary text-sm mb-8">
              {mode === "login"
                ? "Connectez-vous pour accéder à Lumina"
                : "Inscrivez-vous pour commencer à utiliser Lumina"}
            </p>

            {/* M19 — Google Sign In Button, partagé login & signup */}
            <GoogleButton onClick={handleGoogleLogin} disabled={loading} />

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-surface-hover" />
              <span className="text-text-tertiary text-xs">ou</span>
              <div className="flex-1 h-px bg-surface-hover" />
            </div>

            {/* Bouton démo (DEV-only) — remplace le besoin de créer un compte */}
            {import.meta.env.DEV && (
              <div className="mb-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loading}
                  className="text-accent text-xs font-medium flex items-center gap-1 active:opacity-70 border border-accent/30 px-3 py-1.5 rounded-md"
                >
                  🌱 Connexion démo (faker, pas de réseau)
                </button>
              </div>
            )}
            {/* Fin bouton démo */}

            {/* Email/Password Form */}
            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === "signup" && (
                <>
                  <div>
                    <label className="text-text-secondary text-xs font-medium mb-2 block">
                      Prénom
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                        aria-label="Prénom"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-text-secondary text-xs font-medium mb-2 block">
                      Nom
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                        aria-label="Nom"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-text-secondary text-xs font-medium mb-2 block">
                      Rôle
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="w-full pl-4 pr-4 py-3 rounded-xl text-text-primary text-sm appearance-none bg-surface border border-border text-text-primary"
                      aria-label="Rôle"
                      required
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-text-secondary text-xs font-medium mb-2 block">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean.dupont@eglise.local"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="E-mail"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary text-xs font-medium mb-2 block">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    aria-label="Mot de passe"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="text-danger text-xs text-center mt-2">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98] transition-transform rounded-xl py-3 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "login" ? "Connexion…" : "Inscription…"}
                    </>
                  ) : mode === "login" ? (
                    "Se connecter"
                  ) : (
                    "S'inscrire"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 flex justify-center text-text-tertiary text-sm">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-accent font-medium hover:underline"
                  >
                    S'inscrire
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-accent font-medium hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
