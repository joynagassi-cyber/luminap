import { useSyncExternalStore } from "react";
import { PowerSyncContext } from "@powersync/react";
import { getPowerSyncDatabaseOrNull } from "@/lib/powersync";
import {
  isPowerSyncDatabaseCreatedNow,
  subscribePowerSyncDatabaseCreated,
} from "@/lib/powersync/readiness";

/**
 * Fournit la base PowerSync aux hooks de lecture.
 *
 * Depuis A4, la création de la base est ASYNCHRONE (il faut d'abord lire la clé
 * de chiffrement au Keystore). Ce composant est monté immédiatement après le
 * boot : il ne doit donc pas appeler `getPowerSyncDatabase()` (qui LÈVE si la
 * base n'existe pas encore — l'ancien code plantait le premier rendu), mais
 * attendre la notification de création et re-rendre l'arbre à ce moment-là.
 *
 * En attendant, `children` est rendu SANS contexte : les hooks `useQuery`
 * retombent sur leur état « non configuré » explicite (squelette/état vide),
 * jamais sur un écran noir ni une exception.
 */
export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const created = useSyncExternalStore(
    subscribePowerSyncDatabaseCreated,
    isPowerSyncDatabaseCreatedNow,
    () => false,
  );

  const db = created ? getPowerSyncDatabaseOrNull() : null;

  if (!db) {
    // Ne devrait apparaître qu'un instant au démarrage (ou jamais si la base
    // est déjà créée — cas des tests et des rechargements à chaud).
    return <>{children}</>;
  }

  return (
    <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
  );
}
