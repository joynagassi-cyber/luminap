/**
 * useNotificationPermission — orchestration de la demande de notifications.
 *
 * MOMENT DE LA DEMANDE (décision, cf. doc §1.4) :
 *   après la PREMIÈRE TRANSACTION ENREGISTRÉE (la valeur est alors évidente),
 *   une fois par appareil, avec « Plus tard » qui reporte de 7 jours.
 *   Jamais au démarrage à froid : le hook ne fait rien tant que
 *   `markTransactionSaved()` n'a pas été appelé.
 *
 * Le hook ne demande RIEN lui-même : il ouvre le `PermissionPrimer`, et c'est
 * le bouton « Autoriser » qui appelle `permissionService.request()`.
 * Conséquence : il n'existe aucun autre chemin de demande dans l'application.
 *
 * Persistance : une seule clé locale (`lumina-perm-primed-notifications`) —
 * une fois la question posée et réglée (accord, refus définitif, ou accord
 * obtenu par les réglages), on ne la repose plus.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  permissionService,
  type PermissionName,
  type PermissionStatus,
} from "@/lib/nativePermissions";

export const PRIMED_KEY = "lumina-perm-primed-notifications";

function readPrimed(): boolean {
  try {
    return localStorage.getItem(PRIMED_KEY) === "1";
  } catch {
    return false;
  }
}

function writePrimed(): void {
  try {
    localStorage.setItem(PRIMED_KEY, "1");
  } catch {
    /* stockage indisponible : au pire, la question sera reposée */
  }
}

export interface UseNotificationPermission {
  /** État réel de la permission (rafraîchi à l'ouverture, au retour au premier plan). */
  status: PermissionStatus | null;
  /** La feuille d'explication doit-elle être ouverte ? */
  primerOpen: boolean;
  /** Demande en cours (fenêtre système affichée). */
  pending: boolean;
  /** Ouvre la feuille délibérément (Réglages › Notifications). */
  ask: () => Promise<void>;
  /** « Autoriser » dans la feuille → demande système. */
  confirm: () => Promise<void>;
  /** « Plus tard » / fermeture → report 7 jours. */
  dismiss: () => Promise<void>;
  /** « Ouvrir les réglages » (état bloqué). */
  openSettings: () => Promise<void>;
  /** À appeler à la PREMIÈRE transaction enregistrée de l'appareil. */
  markTransactionSaved: () => Promise<void>;
  /** Relit l'état (ex. au retour au premier plan après passage dans les réglages). */
  refresh: () => Promise<void>;
}

export function useNotificationPermission(
  name: PermissionName = "notifications",
): UseNotificationPermission {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // Empêche deux ouvertures concurrentes (double effet React 19 en dev).
  const opening = useRef(false);

  const refresh = useCallback(async () => {
    const next = await permissionService.check(name);
    setStatus(next);
    // Accord obtenu par un autre chemin (réglages Android) : la question est
    // réglée, on ne la reposera plus.
    if (next === "granted" && readPrimed()) {
      setPrimerOpen(false);
    }
  }, [name]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ask = useCallback(async () => {
    if (opening.current) return;
    opening.current = true;
    try {
      const current = await permissionService.check(name);
      setStatus(current);
      // Déjà accordé : rien à expliquer, rien à demander.
      if (current === "granted") {
        setPrimerOpen(false);
        return;
      }
      // `unavailable` (web, plugin absent, permission sans objet) : il n'y a
      // aucune fenêtre système à expliquer. Ouvrir la feuille ferait croire à
      // une fonctionnalité existante — et bloquerait l'écran sur le web.
      if (current === "unavailable") {
        setPrimerOpen(false);
        return;
      }
      // `blocked` : on ouvre quand même, mais l'écran n'affichera que
      // « Ouvrir les réglages » (aucune fenêtre système ne peut apparaître).
      setPrimerOpen(true);
    } finally {
      opening.current = false;
    }
  }, [name]);

  const confirm = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      const next = await permissionService.request(name);
      setStatus(next);
      setPrimerOpen(false);
      writePrimed();
    } finally {
      setPending(false);
    }
  }, [name, pending]);

  const dismiss = useCallback(async () => {
    setPrimerOpen(false);
    const current = status ?? (await permissionService.check(name));
    // « Plus tard » = report, pas un refus définitif : on ne marque pas la
    // question comme réglée, `shouldAsk` tiendra compte du report.
    if (current === "blocked" || current === "granted") {
      writePrimed();
      return;
    }
    await permissionService.snooze(name);
  }, [name, status]);

  const openSettings = useCallback(async () => {
    await permissionService.openAppSettings();
  }, []);

  const markTransactionSaved = useCallback(async () => {
    // Une seule fois par appareil : si la question a déjà été posée, on sort.
    if (readPrimed()) return;
    const should = await permissionService.shouldAsk(name);
    if (!should) return;
    await ask();
  }, [ask, name]);

  return {
    status,
    primerOpen,
    pending,
    ask,
    confirm,
    dismiss,
    openSettings,
    markTransactionSaved,
    refresh,
  };
}

/**
 * Suit le retour de l'application au premier plan : si l'utilisateur est allé
 * activer les notifications dans les réglages Android, l'état doit se mettre à
 * jour sans redémarrage.
 */
export function useRefreshOnResume(onResume: () => void): void {
  useEffect(() => {
    let remove: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("resume", () => onResume());
        if (cancelled) {
          await handle.remove();
          return;
        }
        remove = () => void handle.remove();
      } catch {
        /* web / plugin absent : aucun cycle de vie à suivre */
      }
    })();
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [onResume]);
}
