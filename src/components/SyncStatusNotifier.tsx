/**
 * SyncStatusNotifier — notification ponctuelle « synchronisation non
 * faite » (remplace l'ancien bandeau persistant `SyncUnavailableBanner`,
 * supprimé à la demande produit : l'utilisateur n'a pas besoin d'un
 * bandeau permanent ni de savoir quand tout est synchronisé — il est
 * NOTIFIÉ quand la synchronisation n'aboutit pas).
 *
 * Comportement :
 *  - Composant sans rendu (retourne `null`) monté une fois sous le
 *    routeur. Aucun élément fixe à l'écran.
 *  - Épisode d'échec (réplique indisponible OU erreur d'upload/download)
 *    → UN toast d'avertissement par épisode (réarmé au retour à la
 *    normale ; le garde-fou par épisode évite tout empilement).
 *  - Opérations REJETÉES définitivement par le serveur (journal
 *    `syncRejectedOps`, B-02) → UN toast d'erreur par lot non encore
 *    notifié (filigrane horodaté persisté : pas de re-notification des
 *    anciens rejets à chaque démarrage).
 *  - Silencieux sur les écrans publics (/auth, /splash, /welcome) :
 *    aucune donnée à synchroniser avant connexion.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { showError, showWarning } from "@/utils/toast";
import { useReplicaUnavailable } from "@/lib/dataLayer";
import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";
import {
  getRejectedSyncOps,
  SYNC_REJECTED_EVENT,
} from "@/lib/powersync/syncRejectedOps";

const REJECTED_NOTIFIED_KEY = "lumina-sync-rejected-notified-at";
const HIDDEN_ROUTES = ["/auth", "/splash", "/welcome"];

function loadRejectedWatermark(): string {
  try {
    return localStorage.getItem(REJECTED_NOTIFIED_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveRejectedWatermark(at: string): void {
  try {
    localStorage.setItem(REJECTED_NOTIFIED_KEY, at);
  } catch {
    /* stockage indisponible */
  }
}

export function SyncStatusNotifier() {
  const location = useLocation();
  const replicaUnavailable = useReplicaUnavailable();
  const { syncError } = usePowerSyncIndicator();
  const episodeNotifiedRef = useRef(false);

  const hidden = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  const failing = replicaUnavailable || syncError !== null;

  // Épisode « sync non faite » : un seul toast par épisode.
  useEffect(() => {
    if (!failing) {
      episodeNotifiedRef.current = false;
      return;
    }
    if (hiddenRef.current || episodeNotifiedRef.current) return;
    episodeNotifiedRef.current = true;
    showWarning(
      "Synchronisation non effectuée. Vos données restent conservées sur cet appareil et seront envoyées dès que possible.",
      { durationMs: 8000 },
    );
  }, [failing, location.pathname]);

  // Rejets définitifs serveur : notifier chaque nouveau lot, une fois.
  useEffect(() => {
    const checkRejected = () => {
      if (hiddenRef.current) return;
      const watermark = loadRejectedWatermark();
      const unseen = getRejectedSyncOps().filter((o) => o.at > watermark);
      if (unseen.length === 0) return;
      saveRejectedWatermark(unseen[unseen.length - 1].at);
      showError(
        "Certaines modifications ont été rejetées par le serveur et n'ont pas été synchronisées.",
        { durationMs: 10000 },
      );
    };
    checkRejected();
    window.addEventListener(SYNC_REJECTED_EVENT, checkRejected);
    return () => window.removeEventListener(SYNC_REJECTED_EVENT, checkRejected);
    // `location.pathname` : ré-évaluer en quittant un écran public (les
    // rejets survenus pendant /auth ne sont ni notifiés ni consommés).
  }, [location.pathname]);

  return null;
}
