import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadInitialData } from "@/lib/dataLayer";
import { needsOnboarding } from "@/lib/onboardingState";
import { authService } from "@/lib/auth";
import { IonPage, IonContent } from "@ionic/react";

/**
 * Splash UNIQUE de l'application (demande terrain : la chaîne de démarrage
 * empilait le splash natif forcé 2 s, un splash HTML statique et cette
 * page en 3 écrans successifs — logo, illustration, spinner). Il ne reste
 * que cet écran-ci, avec UN seul visuel (logo + nom + signature) ; le
 * splash natif n'a plus de durée forcée (`launchShowDuration: 0`) et le
 * splash HTML statique a été supprimé.
 *
 * Le gating est inchangé : on attend le chargement des données initiales
 * (avec un affichage minimum court anti-clignotement), puis on route —
 * session → onboarding/dashboard, sinon /welcome. La garde dure
 * anti-blocage (v1.0.2) force la navigation après le délai de secours,
 * même si le chargement ne termine jamais (réseau coupé, première
 * ouverture…). Si les données tardent au-delà du minimum, la mention
 * « Chargement en cours… » apparaît SOUS le même visuel — jamais un
 * second écran.
 */
const MIN_DISPLAY_MS = 600;
const STUCK_SAFETY_NET_MS = 3000;

export default function Splash() {
  const navigate = useNavigate();
  const { loaded: initialDataLoaded } = useLoadInitialData();
  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false);
  const navigatingRef = useRef(false);

  // Transition vers l'étape suivante (welcome / onboarding / dashboard),
  // une seule fois. `getSession()` inclut le repli offline (session
  // persistée) : hors ligne, un utilisateur déjà connecté entre donc
  // directement sur le dashboard, sans passer par /welcome.
  const goToNext = async () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      const session = await authService.getSession();
      if (session) {
        navigate(needsOnboarding() ? "/onboarding" : "/dashboard", {
          replace: true,
        });
      } else {
        navigate("/welcome", { replace: true });
      }
    } catch {
      // Erreur inattendue → toujours atterrir sur /welcome pour ne pas
      // laisser l'utilisateur bloqué sur le splash.
      navigate("/welcome", { replace: true });
    }
  };

  // Affichage minimum (anti-clignotement) — un seul timer, plus de phases.
  useEffect(() => {
    const t = setTimeout(() => setMinDisplayElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Données prêtes + minimum écoulé → on part.
  useEffect(() => {
    if (initialDataLoaded && minDisplayElapsed) void goToNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataLoaded, minDisplayElapsed]);

  // Garde de secours absolue : quel que soit l'état du chargement, on ne
  // reste jamais figé sur cet écran.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!navigatingRef.current) void goToNext();
    }, MIN_DISPLAY_MS + STUCK_SAFETY_NET_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stillLoading = minDisplayElapsed && !initialDataLoaded;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div
          data-screen-state={stillLoading ? "loading" : "ready"}
          className="min-h-dvh flex flex-col items-center justify-center"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          <div className="flex flex-col items-center" data-testid="splash">
            <img
              src="/lumina-logo-version-monochrome.png"
              alt="Lumina"
              width={160}
              height={160}
              className="splash-monochrome-logo"
              style={{ filter: "none", boxShadow: "none", textShadow: "none" }}
            />
            <h1
              className="font-bold text-3xl tracking-wide mt-4"
              style={{ color: "var(--text-primary)", textShadow: "none" }}
            >
              Lumina
            </h1>
            <p
              className="text-sm mt-1 text-center"
              style={{ color: "var(--text-secondary)", textShadow: "none" }}
            >
              Une gestion complète, une foi partagée.
            </p>
            {stillLoading && (
              <p
                className="text-xs mt-6"
                style={{ color: "var(--text-secondary)" }}
                role="status"
              >
                Chargement en cours…
              </p>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
