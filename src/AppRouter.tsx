import { useEffect, useState } from "react";
import { authService } from "@/lib/auth";

/**
 * AppRouter — auth state monitor (no routing logic).
 * All navigation is handled by App.tsx to avoid conflicts
 * with the Ionic router outlet and splash-screen flow.
 */
export default function AppRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // OneSignal n'est plus initialisé au boot : le SDK (plugin Cordova
    // promptForNotifications:true) doit être branché par un flux
    // déclenché par l'utilisateur (ex. SettingsNotifications, toggle
    // « Notifications activées »).

    const checkAuth = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };

    checkAuth();

    const unsubscribe = authService.subscribe(() => {
      setIsAuthenticated(!!authService.getState().session);
    });

    return () => unsubscribe();
  }, []);

  return null;
}
