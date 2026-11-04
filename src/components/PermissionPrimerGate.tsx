import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { IonButton, IonModal, IonSpinner } from "@ionic/react";
import { Capacitor } from "@capacitor/core";
import { BellRing, Check } from "lucide-react";
import { useTransactions } from "@/lib/dataLayer";
import { isPrimerEligible, permissions } from "@/lib/permissionService";

/**
 * Écran d'explication AVANT la première demande de permission
 * (audit §1.4, phase A2) : la fenêtre système n'est jamais la première
 * chose que voit l'utilisateur, et elle n'apparaît qu'après ce primer
 * ou un geste explicite dans les Réglages.
 *
 * Déclenchement (toute la conjonction, voir `isPrimerEligible`) :
 * plateforme native, bénéfice vécu (≥ 1 transaction enregistrée),
 * écran calme (dashboard/finance — jamais au milieu d'un formulaire),
 * permission demandable et aucun refus/report de moins de 7 jours.
 * « Plus tard » ou fermeture par le fond = report de 7 jours
 * (`recordDeferral`). Sur le web, le composant ne rend rien : les
 * tests Cypress et les captures ne sont pas affectés.
 */
const ELIGIBLE_ROUTES = ["/dashboard", "/finance"];

export function PermissionPrimerGate() {
  const location = useLocation();
  const { data: transactions } = useTransactions();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const evaluatedRouteRef = useRef<string | null>(null);
  const activatedRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();
  const routeEligible = ELIGIBLE_ROUTES.includes(location.pathname);
  const hasTransaction = (transactions?.length ?? 0) > 0;

  useEffect(() => {
    if (!isNative || !routeEligible || !hasTransaction || visible) return;
    // Une évaluation par route et par session suffit : l'éligibilité ne
    // peut pas redevenir vraie dans la même session (délai de 7 jours).
    if (evaluatedRouteRef.current === location.pathname) return;
    evaluatedRouteRef.current = location.pathname;
    let cancelled = false;
    void (async () => {
      const [status, lastInteractionAt] = await Promise.all([
        permissions.check("notifications"),
        permissions.lastInteractionAt("notifications"),
      ]);
      if (cancelled) return;
      if (
        isPrimerEligible({
          isNative: true,
          status,
          lastInteractionAt,
          now: Date.now(),
          hasTransaction: true,
          routeEligible: true,
        })
      ) {
        setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNative, routeEligible, hasTransaction, location.pathname, visible]);

  if (!isNative) return null;

  const handleActivate = async () => {
    activatedRef.current = true;
    setBusy(true);
    try {
      await permissions.request("notifications");
    } finally {
      setBusy(false);
      setVisible(false);
    }
  };

  const handleDidDismiss = () => {
    setVisible(false);
    if (!activatedRef.current) {
      void permissions.recordDeferral("notifications");
    }
    activatedRef.current = false;
  };

  return (
    <IonModal
      isOpen={visible}
      breakpoints={[0, 0.65]}
      initialBreakpoint={0.65}
      backdropBreakpoint={0.3}
      onDidDismiss={handleDidDismiss}
      aria-label="Activer les notifications"
    >
      <div
        style={{
          height: "100%",
          overflowY: "auto",
          backgroundColor: "var(--canvas)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex flex-col gap-5 px-6 pb-8 pt-4">
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--on-accent)",
            }}
          >
            <BellRing size={28} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold leading-tight">
              Restez informé en temps réel
            </h2>
            <p className="text-sm leading-relaxed" style={{ opacity: 0.8 }}>
              Activez les notifications pour être prévenu dès qu'une
              opération attend votre validation — même quand l'application
              est fermée. Vous pourrez les désactiver à tout moment dans
              les Réglages.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 text-sm">
            {[
              "Dépenses et recettes à valider",
              "Rappels importants de votre organisation",
              "Uniquement l'essentiel, jamais de spam",
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5">
                <Check
                  size={16}
                  aria-hidden="true"
                  style={{ color: "var(--accent-primary)", flexShrink: 0 }}
                />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1.5">
            <IonButton
              expand="block"
              onClick={() => void handleActivate()}
              disabled={busy}
              aria-label="Activer les notifications"
            >
              {busy ? <IonSpinner name="crescent" /> : "Activer les notifications"}
            </IonButton>
            <IonButton
              expand="block"
              fill="clear"
              onClick={() => setVisible(false)}
              disabled={busy}
            >
              Plus tard
            </IonButton>
          </div>
        </div>
      </div>
    </IonModal>
  );
}
