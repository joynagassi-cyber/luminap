import { PowerSyncContext } from "@powersync/react";
import {
  getPowerSyncDatabase,
  isPowerSyncInitialized,
} from "@/lib/powersync";
import { useEffect, useState } from "react";

/**
 * PowerSyncProvider — attend l'initialisation de la base PowerSync avant de
 * fournir le contexte aux enfants.
 *
 * `initPowerSync()` est appelé en fire-and-forget dans `main.tsx`. Ce
 * composant patiente jusqu'à ce que `_db` soit disponible, puis enveloppe
 * les enfants dans `<PowerSyncContext.Provider>`. Tant que la base n'est pas
 * prête, les enfants sont rendus sans contexte (ils tombent sur leurs replis
 * locaux), ce qui évite l'écran noir causé par l'erreur
 * « Database not initialized ».
 */
export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<ReturnType<typeof getPowerSyncDatabase> | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    const tryInit = () => {
      if (!mounted) return;
      try {
        const database = getPowerSyncDatabase();
        setDb(database);
      } catch {
        // Base pas encore prête : re-tente dans 100 ms
        const timer = setTimeout(tryInit, 100);
        return () => clearTimeout(timer);
      }
    };

    // Si déjà initialisé (ex. HMR), résout immédiatement
    if (isPowerSyncInitialized()) {
      tryInit();
    } else {
      const timer = setTimeout(tryInit, 100);
      return () => clearTimeout(timer);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Tant que la base n'est pas prête, on rend les enfants sans contexte
  // (mode dégradé : lectures locales, pas de sync). Pas d'erreur levée.
  if (!db) {
    return <>{children}</>;
  }

  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
}
