import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import { authService, type Profile } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";
import { needsOnboarding } from "@/lib/onboardingState";
import { useLocalStore } from "@/store/useLocalStore";
import { Loader2, Mail, Lock, User } from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

type AuthMode = "login" | "signup";

/** Official 4-colour Google "G" mark. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H28v8h7.6c-1.7 4.7-6.1 7.9-11.6 7.9-6.8 0-12.3-5.5-12.3-12.3S17.1 13.3 24 13.3c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.3 24 4.3 12.9 4.3 3.9 13.3 3.9 24.5S12.9 45 24 45s20.1-9 20.1-20.1c0-1.6-.3-3.1-.5-4.8z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 11.9 24 11.9c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.3 24 4.3 16.7 4.3 10.2 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.4-2.2 14.1-5.6l-6.5-5.6c-2.1 1.6-4.8 2.6-7.6 2.6-5.5 0-10.2-3.6-11.8-8.5l-6.3 5C10.2 40.3 16.5 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H28v8h7.6c-.9 2.2-2.3 4-4 5.5l6.5 5.6C42.7 35.4 45 30.1 45 24.5 45 22.8 44.5 21.2 43.6 20.1z"
      />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
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
  ) => {
    await loadInitialData();
    await oneSignalService.login(
      profile?.role ?? "MEMBRE",
      profile?.id ?? user?.id ?? "",
    );
    navigate(needsOnboarding() ? "/onboarding" : "/dashboard", {
      replace: true,
    });
  };

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      if (location.pathname === "/auth/callback") {
        const result = await authService.handleOAuthCallback();
        if (result.error) {
          setError(result.error);
        } else if (result.profile) {
          void proceedAfterAuth(result.profile);
        }
      }
    };
    handleCallback();
  }, [location, navigate, loadInitialData, user?.id]);

  // Handle email/password login
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

  // Handle email/password signup — no role at this stage.
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
      setLoading(false);
      return;
    }

    const state = authService.getState();
    setLoading(false);
    await proceedAfterAuth(state.profile);
  };

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    const result = await authService.signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
    // If no error, the OAuth flow redirects and the callback effect routes
    // the user to onboarding / dashboard.
  };

  /**
   * Native OAuth deep-link (Android / iOS).
   *
   * When Google returns the user to the app via `lumina://auth/callback?code=...`
   * (captured by the `lumina://` intent-filter in AndroidManifest.xml), we
   * exchange the code for a real session so the sign-in completes in-app and
   * "holds" — instead of silently dropping into the system browser.
   *
   * We listen on both the cold-launch URL and the "app re-opened" event.
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onNativeDeepLink = async (url: string) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      const code = parsed.searchParams.get("code");
      if (!code) return; // not an OAuth callback (plain lumina:// launch)

      const result = await authService.handleOAuthDeepLink(url);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.profile) {
        void proceedAfterAuth(result.profile);
      }
    };

    let cleanup: (() => void) | undefined;
    let active = true;

    // Cold launch: read the URL the app was started with.
    void CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (active && launch?.url) void onNativeDeepLink(launch.url);
      })
      .catch(() => {
        /* plugin unavailable (web / SSR) — ignore */
      });

    // Warm re-open: Google hands the user back into a running app.
    void CapacitorApp.addListener("appUrlOpen", (evt) => {
      if (active) void onNativeDeepLink(evt.url);
    })
      .then((sub) => {
        if (!active) {
          sub.removeSubscription();
          return;
        }
        cleanup = () => sub.removeSubscription();
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      active = false;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>AuthPage</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-[#121212] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            <div className="text-xs text-[#808080]">
              {authState?.user ? "Connecté" : "Déconnecté"}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full pb-12">
            <h1 className="text-white font-bold text-2xl mb-1">
              {mode === "login" ? "Bon retour" : "Créer un compte"}
            </h1>
            <p className="text-[#808080] text-sm mb-8">
              {mode === "login"
                ? "Connectez-vous pour accéder à Lumina"
                : "Inscrivez-vous pour commencer à utiliser Lumina"}
            </p>

            {/* Google Sign In Button — shared by login & signup */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 rounded-full font-medium text-sm flex items-center justify-center gap-3 mb-4 transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: "#fff",
                color: "#333",
                border: "1px solid #ddd",
              }}
              aria-label="Continuer avec Google"
            >
              <GoogleIcon className="w-5 h-5" />
              Continuer avec Google
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#282828]" />
              <span className="text-[#808080] text-xs">ou</span>
              <div className="flex-1 h-px bg-[#282828]" />
            </div>

            {/* Email/Password Form */}
            <form
              onSubmit={mode === "login" ? handleLogin : handleSignup}
              className="space-y-4"
            >
              {mode === "signup" && (
                <>
                  <div>
                    <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">
                      Prénom
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm"
                        style={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #282828",
                        }}
                        aria-label="Prénom"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">
                      Nom
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm"
                        style={{
                          backgroundColor: "#1E1E1E",
                          border: "1px solid #282828",
                        }}
                        aria-label="Nom"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm"
                    style={{
                      backgroundColor: "#1E1E1E",
                      border: "1px solid #282828",
                    }}
                    aria-label="Adresse email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808080]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm"
                    style={{
                      backgroundColor: "#1E1E1E",
                      border: "1px solid #282828",
                    }}
                    aria-label="Mot de passe"
                    required
                  />
                </div>
              </div>

              {error && (
                <div
                  className="p-3 rounded-xl text-sm text-center"
                  style={{ backgroundColor: "#E5133220", color: "#E51332" }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  !password ||
                  (mode === "signup" && !firstName.trim())
                }
                className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent-primary)" }}
                aria-label={
                  mode === "login" ? "Se connecter" : "Créer mon compte"
                }
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
                className="text-[#808080] text-sm hover:text-white transition-colors"
                aria-label={
                  mode === "login"
                    ? "Passer à l'inscription"
                    : "Passer à la connexion"
                }
              >
                {mode === "login"
                  ? "Pas encore de compte ? Inscrire"
                  : "Déjà un compte ? Se connecter"}
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
