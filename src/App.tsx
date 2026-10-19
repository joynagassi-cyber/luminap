import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IonRouterOutlet } from "@ionic/react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import { useAppUrlOpen, LUMINA_DEEPLINK_EVENT } from "@/hooks/useAppUrlOpen";
import { AppProvider } from "./context/AppContext";
import AppRouter from "./AppRouter";
import { luminaRoutes } from "./ionic/routing";
import { ErrorBoundary, withScope } from "@sentry/react";
import { UpdateDialog } from "@/updater/UpdateDialog";
import { checkForUpdate, type UpdateInfo } from "@/updater/checkForUpdate";
import "./ionic/theme";

// Initialize Ionic React (dark theme applied via setupLuminaTheme)
setupIonicReact({
  mode: "ios",
  animated: true,
  ...({ keyboardBehavior: "ion-focus", keyboardFillMode: "overlap" } as any),
});

const queryClient = new QueryClient();

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/splash", "/auth", "/auth/callback", "/sessions"];

/** Route guard — blocks access to protected routes when unauthenticated.

 *  Two-layer auth check:
 *   1. **Mount check** — async `authService.getSession()` on first render
 *      (covers cold start, hard reload, direct URL entry).
 *   2. **Live subscription** — `authService.subscribe()` keeps
 *      `isAuthenticated` in sync with in-app sign-in / sign-out / session
 *      invalidation (without this, a `proceedAfterAuth` navigation from
 *      AuthPage → /onboarding or /dashboard would see the stale
 *      `isAuthenticated === false` set at mount and immediately bounce
 *      back to /auth via the `<Navigate>` guard).
 */
function RouteGuard() {
  const location = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Layer 1: initial check on mount (cold start / hard reload / direct URL).
  useEffect(() => {
    const check = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsAuthChecked(true);
    };
    check();
  }, []);

  // Layer 2: keep in sync with live auth state changes (sign-in, sign-out,
  // session invalidated, OAuth callback success).
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      setIsAuthenticated(!!authService.getState().session);
    });
    return unsubscribe;
  }, []);

  // Pendant le check, on affiche un spinner plein écran plutôt que null :
  // le fond --canvas (noir) restait seul visible pendant 2-3s (la
  // revalidation réseau du token) et ressemblait à un « écran noir »
  // permanent — en particulier sur mobile où le user ne peut pas recharger.
  if (!isAuthChecked) {
    return (
      <div
        aria-busy="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--canvas)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--accent-primary)",
            borderTopColor: "transparent",
          }}
        />
        <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          Chargement…
        </p>
      </div>
    );
  }

  // Always allow public routes
  if (PUBLIC_ROUTES.includes(location.pathname)) return null;

  // Redirect unauthenticated users to /auth.
  // Log pour diagnostiquer le cas où un clic BottomNav déclenche ce
  // Navigate PENDANT une transition Ionic : le view entrant peut rester
  // stuck en `ion-page-invisible` (écran noir permanent jusqu'au
  // reload). On corrige la racine (le wrapper <Routes>, voir plus bas)
  // et on log ici pour confirmer que le cas ne survient plus.
  if (!isAuthenticated) {
    console.warn(
      `[RouteGuard] Unauthenticated at ${location.pathname} — redirecting to /auth. ` +
        `Si le user a juste cliqué un onglet de la BottomNav, cette navigation ` +
        `a pu casser la transition Ionic (écran noir).`,
    );
    return <Navigate to="/auth" replace />;
  }

  return null;
}

/**
 * AppUrlOpenBridge — renders nothing but registers the app-level
 * `appUrlOpen` deep-link listener (see useAppUrlOpen) for the whole app
 * lifetime, so a `lumina://` OAuth callback arriving on ANY screen is
 * captured — not just when AuthPage is mounted.
 */
const AppUrlOpenBridge = () => {
  useAppUrlOpen();
  // Force re-render sur chaque événement LUMINA_DEEPLINK_EVENT pour que
  // les composants enfants (Splash, Onboarding, etc.) qui lisent
  // `authService.getState().session` re-réagissent immédiatement après
  // un callback OAuth arrivé sur une route publique (fix écran noir après
  // le splash). Without this, a deep-link on /splash updates the session
  // in memory but nothing re-renders the tree → user stuck on the black
  // post-splash screen.
  const [, setVersion] = useState(0);
  useEffect(() => {
    const onDeeplink = () => setVersion((v) => v + 1);
    window.addEventListener(LUMINA_DEEPLINK_EVENT, onDeeplink);
    return () => window.removeEventListener(LUMINA_DEEPLINK_EVENT, onDeeplink);
  }, []);
  return null;
};

/**
 * SentryUserBridge — rattache l'utilisateur connecté au contexte Sentry
 * (replays, corrélation erreurs ↔ user), et le retire à la déconnexion.
 */
const SentryUserBridge = () => {
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      const { user, session } = authService.getState();
      withScope((scope) => {
        if (user?.id && session) {
          scope.setUser({
            id: user.id,
            email: user.email ?? undefined,
          });
        } else {
          scope.setUser(null);
        }
      });
    });
    return unsubscribe;
  }, []);
  return null;
};

/**
 * UpdaterBridge — vérifie une mise à jour (GitHub Releases) une seule fois au
 * démarrage, de façon strictement non-bloquante :
 *   - `checkForUpdate(false)` est fire-and-forget (jamais d'exception levée)
 *   - sur web / iOS / dev navigateur il retourne null immédiatement
 *     (Capacitor.getPlatform() !== 'android') → aucun effet
 *   - le dialogue s'ouvre seulement si une version strictement supérieure
 *     existe
 * Ne modifie PAS l'init PowerSync/Supabase existante (voir AppRouter).
 */
const UpdaterBridge = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    checkForUpdate(false)
      .then((info) => setUpdateInfo(info))
      .catch(() => {
        /* JAMAIS bloquer le démarrage : une erreur updater reste silencieuse. */
      });
  }, []);

  if (!updateInfo) return null;
  return <UpdateDialog />;
};

/**
 * App — wraps the entire Lumina application in IonApp + IonReactRouter.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary fallback={
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--canvas)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          gap: 8,
          padding: 24,
        }}
      >
        <img
          src="/lumina-logo-version-monochrome.png"
          alt="Lumina"
          width={96}
          height={96}
          style={{ filter: "none", boxShadow: "none" }}
        />
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Une erreur inattendue s'est produite.
        </p>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 12 }}>
          Rechargez la page pour réessayer.
        </p>
      </div>
    }>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <IonApp style={{ backgroundColor: "var(--canvas)" }}>
        <SentryUserBridge />
        <AppUrlOpenBridge />
        <UpdaterBridge />
        {/* Lien « sauter au contenu » — premier élément focalisable, masqué
            visuellement jusqu'au focus clavier (a11y : parcours du clavier). */}
        {/* M15 — z-index nommé : --z-toast (70) / --z-skip (100) coordonnés
            avec le nav (40) et les modales (60) ; fin des z-[100] ad-hoc. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none"
          style={{ position: "absolute", left: 12, top: 12, zIndex: "var(--z-skip)", backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
        >
          Aller au contenu principal
        </a>
        <IonReactRouter>
          <RouteGuard />
          <AppRouter />
          <AppProvider>
            <main id="main" style={{ height: "100%" }}>
              {/*
                Le <Routes> est OBLIGATOIRE : @ionic/react-router
                (view-stack) appelle getRoutesChildren() qui ne trouve
                que les routes À L'INTÉRIEUR d'un <Routes> enfant direct
                de <IonRouterOutlet>. Sans lui, le matching ad-hoc de
                matchComponent() échoue sur les routes absolues au root
                outlet et les clics BottomNav laissent le view entrant
                stuck en ion-page-invisible → écran noir permanent
                (mobile : impossible de recharger, l'app est PWA).
                Le key stable force un remount propre du StackManager
                si React re-monte le parent (QueryClientProvider /
                AppProvider re-render) — pas de view-item obsolète.
              */}
              <IonRouterOutlet key="lumina-root-outlet">
                <Routes>
                  {luminaRoutes}
                  <Route path="/">
                    <Navigate to="/splash" replace />
                  </Route>
                </Routes>
              </IonRouterOutlet>
            </main>
          </AppProvider>
        </IonReactRouter>
      </IonApp>
    </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
