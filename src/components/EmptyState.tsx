import { IonButton } from "@ionic/react";
import React from "react";

/**
 * EmptyState — écran d'état vide réutilisable.
 *
 * Illustration : le logo Lumina monochrome
 * (public/lumina-logo-version-monochrome.png) en format réduit (80 px),
 * avec une opacité réduite (0.55) pour qu'il reste décoratif et annonce
 * « quelque chose arrive » sans voler l'attention du titre / de la
 * description.
 *
 * Si un `icon` explicite est passé par le caller, c'est l'`icon` qui
 * est affiché à la place du logo (comportement inchangé par rapport au
 * composant existant — aucune page n'est impactée).
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Attribut passé au conteneur (ex: data-testid conservé d'un état vide legacy). */
  "data-testid"?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  "data-testid": testid,
}: EmptyStateProps) {
  return (
    <div
      data-screen-state="empty"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      data-testid={testid}
    >
      {icon ? (
        <div className="w-16 h-16 mb-4 text-text-tertiary">{icon}</div>
      ) : (
        <div className="mb-6" aria-hidden="true">
          {/* Logo Lumina monochrome — indicateur « quelque chose arrive » :
              opacité 0.55 pour rester décoratif (le titre/description
              portent le sens, le logo ne qualifie pas le contenu).
              Taille réduite (80 px) par rapport au 96 px du splash pour
              se fondre dans la page et ne pas écraser le texte. */}
          <img
            src="/lumina-logo-version-monochrome.png"
            alt=""
            width={80}
            height={80}
            style={{ opacity: 0.55 }}
          />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-tertiary text-sm mb-6 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <IonButton
          onClick={onAction}
          className="!rounded-full !font-semibold !text-sm !py-3 !px-6 transition-all"
          style={{ "--background": "var(--accent-primary)", "--color": "var(--text-primary)" }}
        >
          {actionLabel}
        </IonButton>
      )}
    </div>
  );
}
