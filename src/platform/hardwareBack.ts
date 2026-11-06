// Façade plateforme — bouton retour MATÉRIEL Android (src/platform/).
//
// PROBLÈME (même classe que R447/R448 : capacité native non gérée).
// Ionic gère le bouton retour matériel via l'événement DOM `ionBackButton`
// (relayé par le plugin @capacitor/app depuis l'événement natif `backbutton`)
// avec un REGISTRE PRIORISÉ : chaque composant s'y inscrit avec une priorité,
// le plus haut gagne. Table des priorités Ionic :
//   - overlay Ionic (IonModal / IonAlert / IonActionSheet…) : 100
//   - menu Ionic (IonMenu)                                    :  99
//   - routeur Ionic React (reculer dans la pile)              :   0
// Nos overlays MAISON (`role="dialog"` : FeatureSidebar, bottom-sheets…) ne
// s'inscrivent nulle part : le retour matériel tombait donc sur le routeur
// (reculer) et, à la racine, FERMAIT L'APP au lieu de fermer l'overlay.
//
// SOLUTION : un registre de pile au-dessus (priorité 110). L'overlay du dessus
// capte le retour, se ferme, et CONSOMME l'événement (pas de `processNextHandler`)
// pour ne pas déclencher la navigation de fond ni la sortie de l'app.
//
// SEUL module autorisé à écouter `ionBackButton` / `backbutton` (garde
// platform-abstraction-guard). No-op sur le WEB : aucun bouton retour matériel
// (la fermeture y reste gérée par le clic backdrop / la touche Échap).
import { Capacitor } from "@capacitor/core";

/**
 * Au-dessus des overlays Ionic (100) : un overlay MAISON doit être prioritaire
 * sur les overlays Ionic ET sur le routeur. Exporté pour le test.
 */
export const OVERLAY_BACK_PRIORITY = 110;

type BackHandler = () => void;

const active: BackHandler[] = [];
let installed = false;

interface IonBackButtonEventDetail {
  register: (
    priority: number,
    handler: (processNextHandler: () => void) => void,
  ) => void;
}

function onIonBackButton(ev: Event): void {
  if (active.length === 0) return;
  (ev as CustomEvent<IonBackButtonEventDetail>).detail.register(
    OVERLAY_BACK_PRIORITY,
    () => {
      // Ferme l'overlay le plus récemment ouvert (dernier de la pile).
      active[active.length - 1]?.();
    },
  );
}

/**
 * Enregistre la fermeture d'un overlay sur le bouton retour matériel Android.
 * Renvoie une fonction de désinscription (à appeler au démontage / à la
 * fermeture de l'overlay). Idempotente.
 */
export function registerHardwareBack(handler: BackHandler): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  if (typeof document === "undefined") return () => {};
  if (!installed) {
    document.addEventListener("ionBackButton", onIonBackButton);
    installed = true;
  }
  active.push(handler);
  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    const i = active.lastIndexOf(handler);
    if (i >= 0) active.splice(i, 1);
    if (active.length === 0 && installed) {
      document.removeEventListener("ionBackButton", onIonBackButton);
      installed = false;
    }
  };
}

/** Réservé aux tests : vide la pile et retire l'écouteur. */
export function __resetHardwareBackForTests(): void {
  active.length = 0;
  if (installed && typeof document !== "undefined") {
    document.removeEventListener("ionBackButton", onIonBackButton);
  }
  installed = false;
}
