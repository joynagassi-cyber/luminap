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
    // OneSignal (A2) : le SDK est initialisé au login (`initOneSignal`,
    // pont local 4.8.12) — sans aucune fenêtre. La permission
    // POST_NOTIFICATIONS n'est demandée que via PermissionService, sur
    // geste explicite (Réglages → « Notifications push ») ou après
    // l'écran d'explication (PermissionPrimerGate) — jamais au boot.

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
