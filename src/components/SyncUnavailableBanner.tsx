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
import { CloudOff, RotateCw } from "lucide-react";
import { useReplicaUnavailable } from "@/lib/dataLayer";
import { getPowerSyncConnector, getPowerSyncDatabase } from "@/lib/powersync";

export function SyncUnavailableBanner() {
  const unavailable = useReplicaUnavailable();
  const [retrying, setRetrying] = useState(false);

  if (!unavailable) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await getPowerSyncDatabase().connect(getPowerSyncConnector());
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
        bottom: "calc(var(--nav-height, 56px) + env(safe-area-inset-bottom, 0px))",
        zIndex: "var(--z-toast)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 14px",
        margin: "0 12px 8px",
        borderRadius: "var(--radius, 12px)",
        background: "var(--surface-2, var(--canvas))",
        border: "1px solid var(--border, rgba(0,0,0,.12))",
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
