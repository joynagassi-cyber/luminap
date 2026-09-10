import { useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";

/**
 * AppRouter — auth state monitor (no routing logic).
 * All navigation is handled by App.tsx to avoid conflicts
 * with the Ionic router outlet and splash-screen flow.
 */
export default function AppRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize OneSignal
    oneSignalService.initialize();

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
