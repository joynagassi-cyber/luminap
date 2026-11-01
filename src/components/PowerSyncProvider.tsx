import { PowerSyncContext } from "@powersync/react";
import {
  getPowerSyncDatabase,
  isPowerSyncInitialized,
} from "@/lib/powersync";
import { useEffect, useState } from "react";

/**
 * PowerSyncProvider — attend l'initialisation de la base PowerSync avant de
 * fournir le contexte aux enfants. Tant que la base n'est pas prête, les
 * enfants sont rendus sans contexte (mode dégradé) pour éviter l'écran noir.
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
        const timer = setTimeout(tryInit, 100);
        return () => clearTimeout(timer);
      }
    };

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

  if (!db) {
    return <>{children}</>;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      {children}
    </PowerSyncContext.Provider>
  );
}
