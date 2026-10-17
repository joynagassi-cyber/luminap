import { IonAlert, IonButton, IonButtons, IonProgressBar, IonSpinner } from "@ionic/react";
import { useUpdater } from "./useUpdater";

/**
 * Dialogue « Mise à jour disponible » (Ionic IonAlert + IonProgressBar).
 * Monté dans SettingsAbout (bouton « Rechercher une mise à jour ») et dans
 * App.tsx (vérification au démarrage, UpdaterBridge). L'état du self-updater
 * est global via useUpdater() — un seul dialogue affiché à la fois.
 *
 * « Plus tard » ferme le dialogue (le statut reste "available" : l'utilisateur
 * peut relancer depuis Settings About). Pendant le téléchargement le bouton
 * « Mettre à jour » est désactivé et la barre de progression prend le relais.
 */
export function UpdateDialog() {
  const { status, progress, updateInfo, error, startUpdate } = useUpdater();

  if (!updateInfo) return null;

  const heading =
    status === "downloading"
      ? `Téléchargement de la v${updateInfo.versionName}…`
      : status === "readyToInstall"
        ? "Prêt à installer"
        : `Mise à jour v${updateInfo.versionName} disponible`;

  return (
    <IonAlert
      isOpen
      header={heading}
      subHeader={updateInfo.changelog || undefined}
      role="alertdialog"
    >
      {status === "downloading" && (
        <div style={{ padding: "0.5rem 0" }}>
          <IonProgressBar value={progress / 100} type="determinate" />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {progress}% — {Math.round(updateInfo.sizeBytes / 1024 / 1024)} Mo
          </span>
        </div>
      )}
      {status === "waitingPermission" && (
        <div style={{ padding: "0.5rem 0", fontSize: 14, opacity: 0.8 }}>
          Autorisez « Installer des applications inconnues » dans les
          paramètres Android, puis l'installation reprendra automatiquement.
        </div>
      )}
      {status === "error" && (
        <div
          style={{
            padding: "0.5rem 0",
            fontSize: 14,
            color: "var(--data-danger, #ff5c5c)",
          }}
        >
          {error}
        </div>
      )}
      <IonButtons slot="footer">
        <IonButton onClick={() => undefined}>
          Plus tard
        </IonButton>
        {status === "downloading" ? (
          <IonButton disabled>
            <IonSpinner name="crescent" /> Téléchargement…
          </IonButton>
        ) : (
          <IonButton color="primary" onClick={() => startUpdate()}>
            Mettre à jour
          </IonButton>
        )}
      </IonButtons>
    </IonAlert>
  );
}

export default UpdateDialog;
