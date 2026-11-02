import { PowerSyncContext } from "@powersync/react";
import { getPowerSyncDatabase } from "@/lib/powersync";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const db = getPowerSyncDatabase();

  if (!db) {
    return <>{children}</>;
  }

  return (
    <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
  );
}
