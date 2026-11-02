// Fixed: Capacitor — keyboard-avoidance on the form page (Android/iOS hardware keyboard)
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import { authService, type Profile } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";
import type { Role } from "@/types";
import { needsOnboarding } from "@/lib/onboardingState";
import { readReturnToFromSearch } from "@/lib/routeResolver";
import { useLocalStore } from "@/store/useLocalStore";
import { useKeyboardAvoidance } from "@/hooks/useKeyboardAvoidance";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import GoogleButton from "@/components/GoogleButton";
import { Capacitor } from "@capacitor/core";
import {
  LUMINA_DEEPLINK_EVENT,
  type LuminaDeepLinkDetail,
} from "@/hooks/useAppUrlOpen";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const keyboardHeight = useKeyboardAvoidance();
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

  const [hasPersistedSessions, setHasPersistedSessions] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb-hhgovvrnalibhgpakswi-auth-token");
      setHasPersistedSessions(!!raw);
    } catch {
      setHasPersistedSessions(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      setAuthState(authService.getState());
    });
    return unsubscribe;
  }, []);

  const proceedAfterAuth = async (
    profile: Pick<Profile, "role" | "id"> | null | undefined,
    opts?: { forceOnboarding?: boolean },
  ) => {
    try {
      await loadInitialData();
    } catch (e) {
      console.warn("[auth] loadInitialData failed, continuing:", e);
    }
    try {
      await oneSignalService.login(
        (profile?.role ?? "MEMBRE") as Role,
        profile?.id ?? user?.id ?? "",
      );
    } catch (e) {
      console.warn("[auth] oneSignalService.login failed:", e);
    }
    const returnTo = readReturnToFromSearch(location.search);
    const to =
      opts?.forceOnboarding || needsOnboarding()
        ? "/org-setup"
        : (returnTo ?? "/dashboard");
    navigate(to, { replace: true });
  };

  const callbackHandledRef = useRef(false);
  useEffect(() => {
    if (callbackHandledRef.current) return;
    if (location.pathname !== "/auth/callback") return;
    callbackHandledRef.current = true;
    const handleCallback = async () => {
      const result = await authService.handleOAuthCallback();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        navigate("/auth", { replace: true });
      } else if (result.profile) {
        void proceedAfterAuth(result.profile, { forceOnboarding: result.isNewUser });
      } else {
        const state = authService.getState();
        if (state.profile) {
          void proceedAfterAuth(state.profile);
        } else if (state.user?.id) {
          void proceedAfterAuth({ id: state.user.id, role: "MEMBRE" });
        } else {
          navigate("/auth", { replace: true });
        }
      }
    };
    void handleCallback();
  }, [location.pathname, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authService.signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    const state = authService.getState();
    setLoading(false);
    await proceedAfterAuth(state.profile);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await authService.signUpWithEmail(
      email,
      password,
      firstName,
      lastName,
    );
    if (result.error) {
      setError(result.error);
      if (/already exists/i.test(result.error)) {
        setMode("login");
      }
      setLoading(false);
      return;
    }
    const state = authService.getState();
    setLoading(false);
    await proceedAfterAuth(state.profile, { forceOnboarding: result.isNewUser });
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const result = await authService.signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onNativeDeepLink = (evt: Event) => {
      const detail = (evt as CustomEvent<LuminaDeepLinkDetail>).detail;
      if (!detail) return;
      if (detail.error) {
        setError(detail.error);
        return;
      }
      if (detail.profile) {
        void proceedAfterAuth(detail.profile, { forceOnboarding: detail.isNewUser });
      }
    };
    window.addEventListener(LUMINA_DEEPLINK_EVENT, onNativeDeepLink);
    return () => {
      window.removeEventListener(LUMINA_DEEPLINK_EVENT, onNativeDeepLink);
    };
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between">
            <img
              src="/lumina-logo-version-monochrome.png"
              alt="Lumina"
              className="w-9 h-9 object-contain"
            />
            <div className="flex items-center gap-4">
              {hasPersistedSessions && (
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
          <div className="flex-1 px-6 flex flex-col justify-center max-w-md mx-auto w-full pb-12" style={keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : undefined}>
            <div className="flex flex-col items-center text-center mb-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                <img
                  src="/lumina-logo-version-monochrome.png"
                  alt="Lumina"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <h1 className="text-text-primary font-bold text-2xl leading-tight mb-1">
                {mode === "login" ? "Bon retour" : "Créer un compte"}
              </h1>
              <p className="text-text-tertiary text-sm mb-0">
                {mode === "login"
                  ? "Connectez-vous pour accéder à Lumina"
                  : "Inscrivez-vous pour commencer à utiliser Lumina"}
              </p>
            </div>

            {error && (
              <div
                className="w-full mb-5 p-3.5 rounded-xl text-sm text-center"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--out) 12%, transparent)",
                  color: "var(--out)",
                  border: "1px solid color-mix(in srgb, var(--out) 25%, var(--border))",
                }}
              >
                {error}
              </div>
            )}

            {/* M19 — Google Sign In Button */}
            <GoogleButton onClick={handleGoogleLogin} disabled={loading} className="w-full mb-6" />

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-[1px] bg-border" />
              <span className="text-text-tertiary text-xs">ou</span>
              <div className="flex-1 h-[1px] bg-border" />
            </div>

            {/* Email/Password Form */}
            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === "signup" && (
                <>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      aria-label="Prénom"
                      required
                    />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      aria-label="Nom"
                      required
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@example.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label="Adresse email"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-text-primary text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label="Mot de passe"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  !password ||
                  (mode === "signup" && !firstName.trim())
                }
                className="w-full py-4 rounded-full font-bold text-sm text-black transition-all active:scale-[0.97] disabled:opacity-40 shadow-accent uppercase tracking-wider"
                style={{ backgroundColor: "var(--accent-primary)" }}
                aria-label={mode === "login" ? "Se connecter" : "Créer mon compte"}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : mode === "login" ? (
                  "Se connecter"
                ) : (
                  "Créer mon compte"
                )}
              </button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                }}
                className="text-text-tertiary text-sm hover:text-accent transition-colors"
                aria-label={mode === "login" ? "Passer à l'inscription" : "Passer à la connexion"}
              >
                {mode === "login" ? "Pas encore de compte ? Inscrire" : "Déjà un compte ? Se connecter"}
              </button>
            </div>

            {/* Entrée invitation */}
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate("/invitation/claim")}
                className="text-text-tertiary text-xs hover:text-accent transition-colors"
                aria-label="J'ai un code d'invitation"
              >
                J'ai un code d'invitation
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
