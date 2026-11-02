/**
 * Splash v2 — Écran de lancement premium Lumina.
 *
 * Design : fond sombre, logo centré avec halo d'accent, texte de marque
 * en typographie Inter, indicateur de sync discret en haut à droite.
 *
 * Trois phases : logo → illustration → chargement (si nécessaire)
 * Garde de sécurité : bascule forcée après délai pour éviter l'écran noir.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePowerSyncStatus, useLoadInitialData } from "@/lib/dataLayer";
import { needsOnboarding } from "@/lib/onboardingState";
import { authService } from "@/lib/auth";
import { Wifi, WifiOff } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import { Section } from "@/design/components/PageShell";

const PHASE_LOGO_MS = 700;
const PHASE_ILLUSTRATION_MS = 700;
const STUCK_SAFETY_NET_MS = 3000;

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

  const goToNext = async () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      const session = await authService.getSession();
      if (session) {
        navigate(needsOnboarding() ? "/org-setup" : "/dashboard", {
          replace: true,
        });
      } else {
        navigate("/welcome", { replace: true });
      }
    } catch {
      navigate("/welcome", { replace: true });
    }
  };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("illustration"), PHASE_LOGO_MS);
    const t2 = setTimeout(() => {
      if (navigatingRef.current) return;
      if (initialDataLoadedRef.current) {
        void goToNext();
      } else {
        setPhase("loading");
      }
    }, PHASE_LOGO_MS + PHASE_ILLUSTRATION_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (initialDataLoaded && phase === "loading") void goToNext();
  }, [initialDataLoaded, phase]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!navigatingRef.current) void goToNext();
    }, PHASE_LOGO_MS + PHASE_ILLUSTRATION_MS + STUCK_SAFETY_NET_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div
          data-screen-state={phase === "loading" ? "loading" : "ready"}
          className="min-h-dvh flex flex-col items-center justify-center"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          {/* Indicateur de sync discret */}
          <div
            className="absolute top-6 right-6 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-full"
            style={{
              backgroundColor: "color-mix(in srgb, var(--surface) 80%, var(--canvas))",
              border: "1px solid var(--border)",
              backdropFilter: "blur(8px)",
            }}
          >
            {isPowerSyncReady ? (
              <>
                <Wifi className="w-3 h-3" style={{ color: "var(--in)" }} />
                <span style={{ color: "var(--text-tertiary)" }}>Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
                <span style={{ color: "var(--text-tertiary)" }}>Hors ligne</span>
              </>
            )}
          </div>

          {/* Phase 1 — Logo Lumina centré */}
          {phase === "logo" && (
            <Section titleClass="mb-8">
              <div className="flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                    boxShadow: "var(--shadow-accent)",
                  }}
                >
                  <img
                    src="/lumina-logo-version-monochrome.png"
                    alt="Lumina"
                    width={120}
                    height={120}
                    className="object-contain"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}
                  />
                </div>
                <h1
                  className="text-text-primary font-bold text-4xl tracking-tight leading-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  Lumina
                </h1>
                <p className="text-text-tertiary text-sm mt-2 text-center">
                  Une gestion complète, une foi partagée.
                </p>
              </div>
            </Section>
          )}

          {/* Phase 2 — Illustration */}
          {phase === "illustration" && (
            <Section titleClass="mb-8">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6">
                  <img
                    src="/lumina-logo-version-monochrome.png"
                    alt="Lumina"
                    width={200}
                    height={200}
                    className="object-contain animate-bounce-slow"
                    style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }}
                  />
                  <div
                    className="absolute -inset-1 rounded-3xl bg-accent-primary/20 blur-xl animate-pulse"
                  />
                </div>
                <p className="text-text-tertiary text-sm text-center max-w-xs">
                  Préparation de votre espace de travail…
                </p>
              </div>
            </Section>
          )}

          {/* Phase 3 — Chargement */}
          {phase === "loading" && (
            <Section titleClass="mb-8">
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full border-4 border-border border-t-accent-primary animate-spin"
                />
                <p className="text-text-tertiary text-sm">
                  Chargement en cours…
                </p>
              </div>
            </Section>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
