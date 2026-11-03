/**
 * FormField — wrapper unique des champs de formulaire Ionic.
 *
 * Bug P0-3 : chaque formulaire assemblait à la main
 * `IonItem > IonLabel(position="stacked") + IonInput/IonSelect`. Sur
 * appareil, le label flottant restait superposé à la valeur/au
 * placeholder (formulaires illisibles). Le pattern retenu est le plus
 * simple et le plus fiable : **label au-dessus du champ**, en permanence.
 *
 * - label : au-dessus, 13 px (`stacked`, stylé dans `ionic/theme.css`),
 *   couleur secondaire, astérisque accent si `required` ;
 * - le champ (enfant) garde une hauteur tactile confortable ;
 * - `error` s'affiche sous le champ (12 px, rôle alert), sinon `hint`.
 *
 * Les anciens formulaires non encore migrés utilisent le même rendu via
 * `IonLabel position="stacked"` (stylé globalement) — migrer un champ
 * revient à remplacer son `IonItem` par ce composant.
 */
import type { ReactNode } from "react";
import { IonItem, IonLabel } from "@ionic/react";

export interface FormFieldProps {
  /** Libellé métier affiché au-dessus du champ. */
  label: string;
  /** Affiche l'astérisque obligatoire (couleur accent). */
  required?: boolean;
  /** Message d'erreur sous le champ (remplace le hint). */
  error?: string;
  /** Texte d'aide sous le champ. */
  hint?: string;
  /** id du message d'erreur (aria-describedby côté champ). */
  errorId?: string;
  /** Classes du conteneur (défaut : marge basse standard des formulaires). */
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  required = false,
  error,
  hint,
  errorId,
  className = "mb-5",
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <IonItem
        lines="none"
        className="bg-card rounded-xl form-field"
        style={error ? { border: "1px solid var(--out)" } : undefined}
      >
        <IonLabel position="stacked">
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: "var(--accent-primary)" }}>
              {" *"}
            </span>
          )}
        </IonLabel>
        {children}
      </IonItem>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs mt-1.5 px-1"
          style={{ color: "var(--out)" }}
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-text-tertiary text-xs mt-1.5 px-1">{hint}</p>
      ) : null}
    </div>
  );
}
