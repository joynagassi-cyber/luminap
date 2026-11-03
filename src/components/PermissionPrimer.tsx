/**
 * PermissionPrimer — écran d'explication AFFICHÉ AVANT toute fenêtre système.
 *
 * Android n'affiche la fenêtre de permission que si le code la demande ; il ne
 * l'explique jamais. Un refus obtenu sans contexte est un refus définitif
 * (impossible de redemander). Ce primitif applique la règle du service :
 *   explication → (Plus tard | Autoriser) → fenêtre système → état visible.
 *
 * Aucun composant maison équivalent : c'est une `IonModal` en feuille
 * (`breakpoints`/`initialBreakpoint`), donc un geste de fermeture natif.
 */
import { IonModal, IonContent, IonButton } from "@ionic/react";
// Note : `ionicons` n'est pas une dépendance directe du projet (il n'est
// présent que comme dépendance transitive d'@ionic/react, non résolue par
// pnpm). En attendant la migration `IonIcon` (phase A5), on garde lucide.
import { Bell, BellOff } from "lucide-react";
import type { PermissionStatus } from "@/lib/nativePermissions";

export interface PermissionPrimerProps {
  isOpen: boolean;
  /** Statut RÉEL au moment de l'ouverture (null tant qu'il est inconnu). */
  status: PermissionStatus | null;
  /** Titre de la feuille (par défaut : notifications). */
  title?: string;
  /** Explication : à quoi sert la permission, en une phrase concrète. */
  message: string;
  /** Appelé quand l'utilisateur accepte l'explication (le service demande). */
  onConfirm: () => void;
  /** « Plus tard » (report 7 jours) ou fermeture par geste. */
  onDismiss: () => void;
  /** « Ouvrir les réglages » quand l'état est `blocked`. */
  onOpenSettings?: () => void;
  /** Demande en cours (bouton désactivé, pas de double demande). */
  pending?: boolean;
}

export default function PermissionPrimer({
  isOpen,
  status,
  title = "Activer les notifications ?",
  message,
  onConfirm,
  onDismiss,
  onOpenSettings,
  pending = false,
}: PermissionPrimerProps) {
  // La feuille peut être agrandie par l'utilisateur ; on n'a pas besoin de
  // l'état courant, on expose les deux paliers.
  const blocked = status === "blocked";

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5, 0.75]}
      handleBehavior="cycle"
      data-testid="permission-primer"
    >
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center text-center gap-2 pt-2 pb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            }}
          >
            {blocked ? (
              <BellOff className="w-7 h-7" style={{ color: "var(--accent-primary)" }} />
            ) : (
              <Bell className="w-7 h-7" style={{ color: "var(--accent-primary)" }} />
            )}
          </div>
          <h2 className="text-text-primary text-lg font-semibold">{title}</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            {blocked
              ? "Les notifications sont bloquées pour Lumina dans Android. Pour les réactiver, ouvrez les réglages de l'application."
              : message}
          </p>
        </div>

        {blocked ? (
          <IonButton
            expand="block"
            onClick={onOpenSettings}
            className="mb-2"
            data-testid="permission-primer-open-settings"
          >
            Ouvrir les réglages
          </IonButton>
        ) : (
          <IonButton
            expand="block"
            onClick={onConfirm}
            disabled={pending || status === null}
            className="mb-2"
            data-testid="permission-primer-confirm"
          >
            {pending ? "Demande en cours…" : "Autoriser les notifications"}
          </IonButton>
        )}

        <IonButton
          expand="block"
          fill="clear"
          onClick={onDismiss}
          data-testid="permission-primer-later"
        >
          {blocked ? "Fermer" : "Plus tard"}
        </IonButton>

        {!blocked && (
          <p className="text-text-tertiary text-xs text-center px-4">
            Android affichera ensuite SA propre fenêtre. Vous pouvez refuser :
            Lumina reste utilisable, sans alertes.
          </p>
        )}
      </IonContent>
    </IonModal>
  );
}
