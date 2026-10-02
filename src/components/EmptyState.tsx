import { IonButton } from "@ionic/react";
import React from "react";
import EmptyIllustration from "@/components/EmptyIllustration";

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
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
      data-testid={testid}
    >
      {icon ? (
        <div className="w-16 h-16 mb-4 text-text-tertiary">{icon}</div>
      ) : (
        <div className="mb-5" aria-hidden="true">
          <EmptyIllustration />
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
