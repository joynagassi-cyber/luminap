/**
 * usePowerSyncIndicator — état minimal de synchronisation PowerSync (P1 héro).
 *
 * Renvoie { online, lastSyncAt, syncing, syncError } :
 *  - online : le status courant du connector est `connected`.
 *  - lastSyncAt : dernière date de sync réussie (status.lastSyncedAt).
 *  - syncing : en cours de téléchargement ou d'upload.
 *  - syncError : message d'erreur d'upload OU de download, ou null. Sans lui,
 *    une mutation en file dont l'envoi échoue restait **silencieuse** (l'erreur
 *    n'était que `console.debug`) → l'utilisateur voyait « sync HH:MM » alors
 *    que sa saisie n'était jamais partie (pre-mortem PM19).
 *
 * Implémentation : souscription réactive au `PowerSyncDatabase` singleton
 * via `db.on("status", handler)` (API native @powersync). Si le DB n'est pas
 * encore initialisé (`initPowerSync` non appelé), l'hook renvoie un état
 * neutre et s'abonne à l'auth store pour se raccorder dès que le DB existe.
 */
import { useEffect, useState } from "react";
import type { SyncStatus } from "@powersync/web";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { authService } from "@/lib/auth";

export interface PowerSyncIndicator {
  online: boolean;
  lastSyncAt: Date | null;
  syncing: boolean;
  /** Message d'erreur de synchronisation (upload ou download), sinon null. */
  syncError: string | null;
}

const EMPTY: PowerSyncIndicator = {
  online: false,
  lastSyncAt: null,
  syncing: false,
  syncError: null,
};

function readStatus(): PowerSyncIndicator {
  try {
    const db = getPowerSyncDatabase();
    const s: SyncStatus | undefined = (db as any).currentStatus;
    const err =
      s?.uploadError?.message ?? s?.downloadError?.message ?? null;
    return {
      online: s?.connected === true,
      lastSyncAt: s?.lastSyncedAt ? new Date(s.lastSyncedAt) : null,
      syncing: s?.downloading === true || s?.uploading === true || s?.connecting === true,
      syncError: err,
    };
  } catch {
    return EMPTY;
  }
}

export function usePowerSyncIndicator(): PowerSyncIndicator {
  const [state, setState] = useState<PowerSyncIndicator>(EMPTY);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const attach = () => {
      if (unsub) return; // déjà attaché
      try {
        const db = getPowerSyncDatabase() as any;
        setState(readStatus());
        db.on?.(
          "status",
          () => setState(readStatus()),
        );
        unsub = () => {
          try {
            db.off?.("status");
          } catch {
            /* noop */
          }
          unsub = null;
        };
      } catch {
        // DB pas encore initialisée — on écoute l'auth pour ré-essayer au
        // prochain sign-in (initPowerSync est appelé depuis l'app root).
      }
    };

    attach();
    unsubAuth = authService.subscribe(() => attach());

    return () => {
      unsubAuth?.();
      unsub?.();
    };
  }, []);

  return state;
}
