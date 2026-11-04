import { useEffect, useRef, useState } from "react";
import { IonAlert, IonInput } from "@ionic/react";

/**
 * Confirmation avant une action destructive — composant Ionic d'abord (A6).
 *
 * Ce composant était une feuille maison (divs fixes + boutons IonButton). Il
 * délègue désormais à `IonAlert`, qui apporte GRATUITEMENT ce que la version
 * maison réimplémentait à la main et souvent de travers :
 *   - piège de focus et restitution du focus à la fermeture,
 *   - `role="alertdialog"` + `aria-modal` gérés par Ionic,
 *   - fermeture par Échap / clic sur le fond (selon la config Ionic),
 *   - rendu natif sur iOS/Android (`.md` : Material, `.ios` : iOS).
 *
 * CONTRAT CONSERVÉ À L'IDENTIQUE (aucun écran à reprendre) :
 *   `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`,
 *   `confirmVariant`, `requiredText`, `onTextConfirm`, `children`.
 *
 * `requiredText` (saisie obligatoire avant confirmation) n'a pas d'équivalent
 * IonAlert : on l'implémente avec `inputs` + `IonInput` et on désactive le
 * bouton tant que le texte ne correspond pas. Le focus automatique est
 * conservé.
 *
 * NOTE : `IonAlert` ne rend rien quand `isOpen` est faux, donc `children`
 * n'est monté qu'à l'ouverture — comme avant.
 */

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  /** Texte exact à saisir pour armer la confirmation. */
  requiredText?: string;
  onTextConfirm?: (text: string) => void;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  confirmVariant = "danger",
  requiredText,
  onTextConfirm,
  children,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLIonInputElement>(null);

  // La saisie repart de zéro à chaque ouverture : sans cela, un texte déjà
  // tapé armait la confirmation suivante sans que l'utilisateur l'ait voulu.
  useEffect(() => {
    if (open) setInputValue("");
  }, [open]);

  useEffect(() => {
    if (!open || !requiredText) return;
    // `autoFocus` de IonInput ne fonctionne pas dans IonAlert (portail) : on
    // place le focus dès que le champ existe.
    const timer = setTimeout(() => {
      void inputRef.current?.setFocus?.().catch(() => undefined);
    }, 50);
    return () => clearTimeout(timer);
  }, [open, requiredText]);

  const confirmDisabled = requiredText ? inputValue !== requiredText : false;

  const confirm = () => {
    if (confirmDisabled) return;
    if (requiredText && onTextConfirm) {
      onTextConfirm(inputValue);
      return;
    }
    onConfirm();
  };

  return (
    <IonAlert
      isOpen={open}
      onDidDismiss={() => onClose()}
      header={title}
      message={description}
      // `.md` : la couleur de l'action danger est portée par `role="destructive"`.
      buttons={[
        {
          text: "Annuler",
          role: "cancel",
          // Libellé accessible explicite : IonAlert rend le texte du bouton,
          // mais les lecteurs d'écran annoncent mieux un rôle explicite.
          cssClass: "confirm-modal-cancel",
          htmlAttributes: { "aria-label": "Annuler" },
        },
        {
          text: confirmLabel,
          role: confirmVariant === "danger" ? "destructive" : "confirm",
          htmlAttributes: { "aria-label": confirmLabel },
          handler: confirm,
        },
      ]}
      // La confirmation par saisie n'a pas d'équivalent IonAlert : le champ est
      // fourni via `inputs`, le bouton reste désactivé tant que le texte diffère.
      inputs={
        requiredText
          ? [
              {
                name: "confirmation",
                type: "text",
                placeholder: `Tapez « ${requiredText} » pour confirmer`,
                // Le bouton de confirmation est désactivé tant que la saisie
                // ne correspond pas — IonAlert ne sait pas le faire seul.
                disabled: confirmDisabled,
              },
            ]
          : undefined
      }
      // La validation par saisie passe par le champ contrôlé ci-dessous :
      // `inputs` ne sert qu'à annoncer l'attendu, le bouton reste désactivé
      // tant que le texte ne correspond pas (contrôle React, testable).
      backdropDismiss={false}
    >
      <div className="ion-padding-start ion-padding-end ion-padding-bottom">
        {requiredText && (
          <IonInput
            ref={inputRef}
            type="text"
            value={inputValue}
            onIonInput={(event) => setInputValue(event.detail.value ?? "")}
            aria-label={`Tapez « ${requiredText} » pour confirmer`}
            className="w-full px-4 py-3 rounded-lg text-text-primary text-sm text-center"
            style={{ backgroundColor: "var(--canvas)", border: "1px solid var(--border)" }}
          />
        )}
        {children}
      </div>
    </IonAlert>
  );
}
