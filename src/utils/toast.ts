import { reportError } from "@/lib/observability/errorReporter";
import { loadIonicCore } from "@/utils/load-ionic-core";

/**
 * Façade de retour utilisateur éphémère (A6) — adossée au `IonToast`
 * d'Ionic via son contrôleur impératif.
 *
 * Avant A6, DEUX moteurs de toast web tiers cohabitaient (dont un via
 * `use-toast`) et deux hôtes étaient montés dans `App`. Il n'en reste
 * qu'un : le toast Ionic (rendu Material sur Android grâce au mode par
 * plateforme A5, couleurs de la palette A5). L'API `show*` est conservée
 * à l'identique pour les appelants historiques ; `header` sert le cas
 * titre + détail (ancien format Radix).
 *
 * Un échec d'affichage ne doit jamais casser le flux métier qui voulait
 * juste informer — il est journalisé (`reportError`), pas propagé.
 */
export interface ToastOptions {
  /** Titre affiché au-dessus du message (une ligne). */
  header?: string;
  /** Durée d'affichage en ms (défauts : 3 000 ; 4 500 pour les erreurs). */
  durationMs?: number;
}

async function presentToast(
  message: string,
  color: string | undefined,
  opts?: ToastOptions,
): Promise<void> {
  try {
    const { toastController } = await loadIonicCore();
    const toast = await toastController.create({
      header: opts?.header,
      message,
      color,
      duration: opts?.durationMs ?? (color === "danger" ? 4500 : 3000),
      position: "bottom",
    });
    await toast.present();
  } catch (error) {
    reportError(error, { source: "toast-present" });
  }
}

export const showSuccess = (message: string, opts?: ToastOptions): void => {
  void presentToast(message, "success", opts);
};

export const showError = (message: string, opts?: ToastOptions): void => {
  void presentToast(message, "danger", opts);
};

export const showWarning = (message: string, opts?: ToastOptions): void => {
  void presentToast(message, "warning", opts);
};

export const showInfo = (message: string, opts?: ToastOptions): void => {
  void presentToast(message, undefined, opts);
};
