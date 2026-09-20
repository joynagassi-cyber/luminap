import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePowerSyncStatus, useLoadInitialData } from "@/lib/dataLayer";
import { needsOnboarding } from "@/lib/onboardingState";
import { Wifi, WifiOff } from "lucide-react";
import LuminaLogo from "@/components/LuminaLogo";
import SplashIllustration from "@/components/SplashIllustration";
import { IonPage, IonContent } from "@ionic/react";

/**
 * Splash en deux phases, statiques :
 *  1. « logo » (~1,2 s) — logo Lumina centré + nom.
 *  2. « illustration » (~1,5 s) — illustration plate (gestion d'une
 *     organisation) au centre + logo en bas.
 *
 * Le gating existant (onboarding + chargement des données) est conservé :
 * si les données ne sont pas prêtes après les ~2,7 s d'affichage minimum,
 * on bascule sur le spinner de chargement (comportement actuel).
 */
const PHASE_LOGO_MS = 1200;
const PHASE_ILLUSTRATION_MS = 1500;

type SplashPhase = "logo" | "illustration" | "loading";

export default function Splash() {
  const navigate = useNavigate();
  const { loaded: initialDataLoaded } = useLoadInitialData();
  const isPowerSyncReady = usePowerSyncStatus();
  const [phase, setPhase] = useState<SplashPhase>("logo");
  const navigatingRef = useRef(false);
  const initialDataLoadedRef = useRef(initialDataLoaded);
  useEffect(() => {
    initialDataLoadedRef.current = initialDataLoaded;
  }, [initialDataLoaded]);

  // Transition vers l'étape suivante (onboarding / dashboard), une fois.
  const goToNext = () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    navigate(needsOnboarding() ? "/onboarding" : "/dashboard", {
      replace: true,
    });
  };

  // Timers des deux phases (affichage minimum ~2,7 s).
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("illustration"), PHASE_LOGO_MS);
    const t2 = setTimeout(() => {
      if (navigatingRef.current) return;
      if (initialDataLoadedRef.current) {
        goToNext();
      } else {
        setPhase("loading");
      }
    }, PHASE_LOGO_MS + PHASE_ILLUSTRATION_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Les données ont fini de charger PENDANT le spinner « loading » (après
  // la rampe minimum de ~2,7 s) : on part. Tant que la rampe n'est pas
  // finie, on respecte l'affichage minimum des deux phases (logo puis
  // illustration) — le timer t2 relance goToNext si les données étaient
  // déjà prêtes.
  useEffect(() => {
    if (initialDataLoaded && phase === "loading") goToNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataLoaded, phase]);

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          {/* Sync indicator */}
          <div
            className="absolute top-4 right-4 flex items-center gap-2 text-xs"
            style={{ color: isPowerSyncReady ? "var(--data-income)" : "var(--text-secondary)" }}
          >
            {isPowerSyncReady ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isPowerSyncReady ? "Sync" : "Offline"}</span>
          </div>

          {phase === "logo" && (
            /* Phase 1 — logo Lumina centré */
            <div className="flex flex-col items-center" data-testid="splash-phase-logo">
              <LuminaLogo size={96} />
              <h1
                className="font-bold text-3xl tracking-wide mt-4"
                style={{ color: "var(--accent-primary)" }}
              >
                Lumina
              </h1>
              <p className="text-[var(--text-tertiary)] text-sm mt-1">
                Gestion financière des églises
              </p>
            </div>
          )}

          {phase === "illustration" && (
            /* Phase 2 — illustration plate au centre + logo en bas */
            <div
              className="flex flex-col items-center w-full"
              data-testid="splash-phase-illustration"
            >
              <SplashIllustration size={280} />
              <div
                className="absolute bottom-14 flex flex-col items-center"
                aria-hidden={phase !== "illustration"}
              >
                <LuminaLogo size={40} />
                <p
                  className="font-bold text-base tracking-wide mt-2"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Lumina
                </p>
              </div>
            </div>
          )}

          {phase === "loading" && (
            /* Données pas encore prêtes : spinner de chargement (gate) */
            <div className="flex flex-col items-center gap-3" data-testid="splash-loading">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: "var(--accent-primary)",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-[var(--text-tertiary)] text-xs">
                Chargement en cours…
              </p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
