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
import { AppProvider } from "./context/AppContext";
import SyncIndicator from "./components/SyncIndicator";
import AppRouter from "./AppRouter";
import { luminaRoutes } from "./ionic/routing";
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
 * App — wraps the entire Lumina application in IonApp + IonReactRouter.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <IonApp>
        {/* Lien « sauter au contenu » — premier élément focalisable, masqué
            visuellement jusqu'au focus clavier (a11y : parcours du clavier). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none"
          style={{ backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
        >
          Aller au contenu principal
        </a>
        <IonReactRouter>
          <RouteGuard />
          <AppRouter />
          <AppProvider>
            <SyncIndicator />
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
  </QueryClientProvider>
);

export default App;
