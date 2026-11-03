/**
 * SyncUnavailableBanner — filet de sécurité P0 « zéro écran muet ».
 *
 * Contexte : de nombreuses pages gardent leur contenu réel derrière
 * `isPowerSyncReadyNow()` (famille R52 — voulu : ne pas afficher un verdict
 * vide faux). Si la réplique PowerSync ne devient JAMAIS prête (jeton refusé
 * par le service, réseau coupé), ces pages restent sur leur squelette de
 * chargement — un écran qui charge sans fin, sans explication ni issue.
 *
 * `useReplicaUnavailable()` bascule à `true` quand la disponibilité n'est pas
 * atteinte dans le délai imparti (voir `dataLayer`). Cette bannière donne
 * alors un état EXPLICITE et une action (réessayer), hors du flux de route
 * (elle n'altère pas `data-screen-state` du contenu).
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { CloudOff, RotateCw } from "lucide-react";
import { markPowerSyncReady, useReplicaUnavailable } from "@/lib/dataLayer";
import { getPowerSyncConnector, getPowerSyncDatabase } from "@/lib/powersync";

export function SyncUnavailableBanner() {
  const unavailable = useReplicaUnavailable();
  const [retrying, setRetrying] = useState(false);

  if (!unavailable) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await getPowerSyncDatabase().connect(getPowerSyncConnector());
      // Reconnexion réussie : lever l'état « indisponible » pour que la
      // bannière se referme sans rechargement (le listener de disponibilité
      // referme le hook, qui relit l'état vrai).
      markPowerSyncReady();
    } catch {
      // La reconnexion est best-effort : PowerSync retente de lui-même.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-sync-unavailable="true"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))",
        zIndex: "var(--z-toast)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 14px",
        margin: "0 12px 8px",
        borderRadius: "var(--radius, 12px)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        fontSize: 13,
      }}
    >
      <CloudOff size={16} aria-hidden="true" />
      <span style={{ flex: 1 }}>
        Synchronisation indisponible. Vos données locales restent consultables.
      </span>
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          border: "none",
          background: "var(--accent-primary)",
          color: "var(--on-accent)",
          fontWeight: 600,
          cursor: retrying ? "default" : "pointer",
        }}
      >
        <RotateCw size={14} aria-hidden="true" />
        {retrying ? "Réessai…" : "Réessayer"}
      </button>
    </div>
  );
}

/**
 * Porte d'affichage pilotée par la route (bug P1-5) : sur les écrans
 * publics d'authentification, la bannière de synchronisation fixe en bas
 * recouvrait le lien « S'inscrire » et n'a aucun sens (pas encore de
 * données à synchroniser). À monter SOUS le routeur (cf. App.tsx) ; le
 * composant de base reste testable sans routeur.
 */
export function SyncUnavailableBannerGate() {
  const location = useLocation();
  const hiddenRoutes = ["/auth", "/splash", "/welcome"];
  const hidden = hiddenRoutes.some(
    (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
  );
  if (hidden) return null;
  return <SyncUnavailableBanner />;
}
