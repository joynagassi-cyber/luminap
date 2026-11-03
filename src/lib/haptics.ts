/**
 * Retour haptique — une seule API pour toute l'application.
 *
 * `@capacitor/haptics` (installé en phase A3) fournit les vibrations natives ;
 * sur le web il n'y a rien à faire, et une erreur de vibration ne doit JAMAIS
 * empêcher une action métier (enregistrer une transaction, approuver…).
 * D'où : no-op hors natif, et `void` partout (jamais d'await bloquant).
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Succès d'une action métier (enregistrement, approbation). */
export function hapticSuccess(): void {
  if (!isNative()) return;
  void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

/** Erreur (validation refusée, échec d'enregistrement). */
export function hapticError(): void {
  if (!isNative()) return;
  void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}

/** Action principale / confirmation légère (tap sur un bouton primaire). */
export function hapticImpact(style: ImpactStyle = ImpactStyle.Light): void {
  if (!isNative()) return;
  void Haptics.impact({ style }).catch(() => {});
}

export { ImpactStyle, NotificationType };
