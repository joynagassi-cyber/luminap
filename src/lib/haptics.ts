/**
 * Retour haptique (C-03, A3) — sensation tactile sur les moments qui
 * comptent (enregistrement d'une transaction, scan décodé), via
 * @capacitor/haptics. Avant A3, l'app n'avait aucune sensation tactile.
 *
 * Règles : natif uniquement (no-op silencieux sur le web — Cypress et
 * PWA inchangés) ; ne rejette JAMAIS (un retour tactile ne doit pas
 * casser le flux métier qu'il ponctue) ; appels fire-and-forget du
 * point de vue de l'appelant.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

function fire(action: () => Promise<void>): void {
  if (!Capacitor.isNativePlatform()) return;
  void action().catch(() => {});
}

export const haptics = {
  /** Enregistrement réussi, scan décodé… */
  success(): void {
    fire(() => Haptics.notification({ type: NotificationType.Success }));
  },
  /** Échec d'enregistrement. */
  error(): void {
    fire(() => Haptics.notification({ type: NotificationType.Error }));
  },
  /** Boutons d'action principaux. */
  light(): void {
    fire(() => Haptics.impact({ style: ImpactStyle.Light }));
  },
};
