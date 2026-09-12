import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IonRouterOutlet } from "@ionic/react";
import { Route, Navigate, useLocation } from "react-router-dom";
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
const PUBLIC_ROUTES = ["/splash", "/auth", "/auth/callback"];

/** Route guard — blocks access to protected routes when unauthenticated */
function RouteGuard() {
  const location = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const check = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsAuthChecked(true);
    };
    check();
  }, []);

  // While checking, render nothing to avoid flash of wrong page
  if (!isAuthChecked) return null;

  // Always allow public routes
  if (PUBLIC_ROUTES.includes(location.pathname)) return null;

  // Redirect unauthenticated users to /auth
  if (!isAuthenticated) {
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
        <IonReactRouter>
          <RouteGuard />
          <AppRouter />
          <AppProvider>
            <SyncIndicator />
            <IonRouterOutlet>
              {luminaRoutes}
              <Route path="/">
                <Navigate to="/splash" replace />
              </Route>
            </IonRouterOutlet>
          </AppProvider>
        </IonReactRouter>
      </IonApp>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
