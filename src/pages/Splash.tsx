import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePowerSyncStatus, useLoadInitialData } from "@/lib/dataLayer";
import { needsOnboarding } from "@/lib/onboardingState";
import { Wifi, WifiOff } from "lucide-react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

const SPLASH_DURATION = 2000;

export default function Splash() {
  const navigate = useNavigate();
  const { loaded: initialDataLoaded } = useLoadInitialData();
  const isPowerSyncReady = usePowerSyncStatus();
  const [phase, setPhase] = useState<"initializing" | "loading">(
    "initializing",
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setPhase("initializing");

      // Wait for native Capacitor splash to finish (~2s)
      await new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION));

      if (cancelled) return;
      setPhase("loading");

      // Wait for initial data load (config + cotisations) to complete
      // The hook tracks readiness; we poll briefly or wait a tick
      await new Promise((r) => setTimeout(r, 100));

      if (cancelled) return;

      // Onboarding (new or legacy flow) finished → straight to the
      // dashboard; otherwise resume the onboarding where the user left off.
      navigate(needsOnboarding() ? "/onboarding" : "/dashboard", {
        replace: true,
      });
    }
    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Splash</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: "#121212" }}
        >
          {/* Sync indicator */}
          <div
            className="absolute top-4 right-4 flex items-center gap-2 text-xs"
            style={{ color: isPowerSyncReady ? "#1DB954" : "#B3B3B3" }}
          >
            {isPowerSyncReady ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>{isPowerSyncReady ? "Sync" : "Offline"}</span>
          </div>

          <div className="mb-6">
            <img
              src="/lumina-logo.png"
              alt="Lumina"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1
            className="text-white font-bold text-3xl tracking-wide mb-2"
            style={{ color: "var(--accent-primary)" }}
          >
            Lumina
          </h1>
          <p className="text-[#808080] text-sm mb-10">
            Gestion financière des églises
          </p>
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
              <p className="text-[#808080] text-xs">Chargement en cours…</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
