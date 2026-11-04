/**
 * Tirer pour synchroniser (A7) — `IonRefresher`.
 *
 * AVANT : aucun moyen de forcer une synchronisation à la main. L'utilisateur
 * hors-ligne voyait « synchronisation indisponible » et n'avait aucune action
 * à sa disposition ; il fallait quitter l'écran et espérer. Le geste
 * « tirer pour rafraîchir » est attendu sur mobile et coûte un geste, pas un
 * détour par les réglages.
 *
 * CE QUE FAIT LE HOOK (et ce qu'il ne fait pas) :
 *  - il rend l'état à passer à `<IonRefresher>` (`isOpen`) et un `onIonRefresh`
 *    prêt à l'emploi ;
 *  - il **ne fabrique pas** de synchronisation factice : `waitForFirstSync()`
 *    est la seule API qui prouve qu'un cycle a abouti. Si PowerSync n'est pas
 *    prêt (non initialisé, hors-ligne), le geste se termine avec un message
 *    explicite — jamais un spinner éternel ;
 *  - il **borne** l'attente : au-delà du délai, on rend la main en signalant
 *    l'échec (un refresher qui ne se referme jamais bloque l'écran).
 *
 * NON-VACUITÉ : supprimer le `complete()` du chemin d'échec fait échouer le
 * test « délai dépassé : le geste se termine ».
 */

import { useCallback, useRef, useState } from "react";

/** Sous-ensemble de la base réellement utilisé (facilite le mock en test). */
export interface SyncableDatabase {
  waitForFirstSync: () => Promise<void>;
  currentStatus?: { connected?: boolean; lastSyncedAt?: Date | null };
}

export interface PullToSyncOptions {
  /** Base à rafraîchir ; `null` quand PowerSync n'est pas initialisé. */
  getDatabase: () => SyncableDatabase | null;
  /** Délai maximal avant de rendre la main (défaut 15 s). */
  timeoutMs?: number;
  /** Message affiché quand la synchronisation n'a pas abouti. */
  failureMessage?: string;
  /** Notification (toast). Injectable pour rester testable sans Ionic. */
  notify?: (message: string, kind: "success" | "error") => void;
}

export interface PullToSyncState {
  isOpen: boolean;
  onIonRefresh: (event: CustomEvent<{ complete: () => void }>) => Promise<void>;
  /** Dernier résultat, pour l'affichage (null = jamais tenté). */
  lastResult: "success" | "error" | null;
}

export const DEFAULT_PULL_TIMEOUT_MS = 15_000;

export function usePullToSync({
  getDatabase,
  timeoutMs = DEFAULT_PULL_TIMEOUT_MS,
  failureMessage = "Synchronisation non aboutie. Vérifiez votre connexion.",
  notify,
}: PullToSyncOptions): PullToSyncState {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState<"success" | "error" | null>(null);
  // Empêche deux gestes concurrents de lancer deux cycles d'attente.
  const running = useRef(false);

  const onIonRefresh = useCallback(
    async (event: CustomEvent<{ complete: () => void }>) => {
      const complete = () => {
        try {
          event.detail.complete();
        } finally {
          setIsOpen(false);
        }
      };

      if (running.current) {
        // Un geste déjà en cours : on referme proprement celui-ci sans lancer
        // un second cycle.
        complete();
        return;
      }

      const db = getDatabase();
      if (!db) {
        // PowerSync pas encore prêt (démarrage, mode dégradé) : le dire.
        setLastResult("error");
        notify?.(failureMessage, "error");
        complete();
        return;
      }

      running.current = true;
      setIsOpen(true);

      try {
        await withTimeout(db.waitForFirstSync(), timeoutMs);
        setLastResult("success");
        notify?.("Synchronisation effectuée.", "success");
      } catch {
        // Aucune erreur avalée : le résultat est qualifié et affiché.
        setLastResult("error");
        notify?.(failureMessage, "error");
      } finally {
        running.current = false;
        // TOUJOURS refermer, y compris sur échec ou délai dépassé : un
        // refresher ouvert fige l'écran et donne l'impression d'un plantage.
        complete();
      }
    },
    [getDatabase, timeoutMs, failureMessage, notify],
  );

  return { isOpen, onIonRefresh, lastResult };
}

/** Rejette après `ms` — pour ne jamais laisser un spinner bloqué. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Délai de synchronisation dépassé (${ms} ms)`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
