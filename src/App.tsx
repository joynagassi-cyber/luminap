import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IonRouterOutlet } from "@ionic/react";
import { Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import SyncIndicator from "./components/SyncIndicator";
import AppRouter from "./AppRouter";
import { luminaRoutes } from "./ionic/routing";
import "./ionic/theme";

// Initialize Ionic React (dark theme applied via setupLuminaTheme)
setupIonicReact({
  mode: 'ios',
  animated: true,
  keyboardBehavior: 'ion-focus',
  keyboardFillMode: 'overlap',
});

const queryClient = new QueryClient();

/**
 * App — wraps the entire Lumina application in IonApp + IonReactRouter.
 * Replaces BrowserRouter while preserving all existing route paths.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <IonApp>
        <IonReactRouter>
          <AppProvider>
            <SyncIndicator />
            <IonRouterOutlet>
              {luminaRoutes}
              <Route path="/">
                <Navigate to="/splash" replace />
              </Route>
              <Route path="*">
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
