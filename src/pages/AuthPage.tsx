import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppConfig, useCurrentUser } from "@/lib/dataLayer";
import { authService, type Profile } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";
import { Loader2, Mail, Lock, User } from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const { config: appConfig } = useAppConfig();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
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

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      if (location.pathname === "/auth/callback") {
        const result = await authService.handleOAuthCallback();
        if (result.error) {
          setError(result.error);
        } else if (result.profile) {
          // Auto-select role from profile and proceed to dashboard
          await selectRole(result.profile.role as any);
          await loadInitialData();
          await oneSignalService.login(
            result.profile.role as any,
            result.profile.id,
          );
          navigate("/dashboard", { replace: true });
        }
      }
    };
    handleCallback();
  }, [location, navigate, selectRole, loadInitialData]);

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

    // Get profile and select role
    const state = authService.getState();
    if (state.profile) {
      await selectRole(state.profile.role as any);
      await loadInitialData();
      await oneSignalService.login(state.profile.role as any, state.profile.id);
      navigate("/dashboard", { replace: true });
    }
    setLoading(false);
  };

  // Handle email/password signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!role) {
      setError("Veuillez sélectionner un rôle");
      setLoading(false);
      return;
    }

    const result = await authService.signUpWithEmail(
      email,
      password,
      firstName,
      lastName,
      role as any,
    );
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Get profile and proceed
    const state = authService.getState();
    if (state.profile) {
      await selectRole(state.profile.role as any);
      await loadInitialData();
      await oneSignalService.login(state.profile.role as any, state.profile.id);
      navigate("/dashboard", { replace: true });
    }
    setLoading(false);
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
    // If no error, the OAuth flow will redirect and handle the callback
  };

  const roles = [
    { id: "TREASURIER", label: "Trésorier" },
    { id: "PASTEUR", label: "Pasteur" },
    { id: "SECRETAIRE", label: "Secrétaire" },
    { id: "COMPTABLE", label: "Comptable" },
    { id: "TREASURIER_ADJOINT", label: "Trés. Adjoint" },
    { id: "SECRETAIRE_ADJOINT", label: "Secr. Adjoint" },
  ];

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

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 rounded-full font-medium text-sm flex items-center justify-center gap-3 mb-4 transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: "#fff",
                color: "#333",
                border: "1px solid #ddd",
              }}
              aria-label="Continuer avec email"
            >
              <Mail className="w-5 h-5" />
              Continuer avec email
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

                  <div>
                    <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">
                      Rôle
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm"
                      style={{
                        backgroundColor: "#1E1E1E",
                        border: "1px solid #282828",
                      }}
                      aria-label="Rôle"
                    >
                      <option value="">Sélectionner un rôle</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
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
                disabled={loading || !email || !password}
                className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "#FF6B00" }}
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
