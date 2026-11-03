/**
 * Canal Android de Lumina — créé AVANT toute notification.
 *
 * Pourquoi : `@capacitor/local-notifications` crée un canal `"default"` à son
 * chargement et `notification.scheduleLocalNotification` crée `lumina-default`
 * juste avant un envoi LOCAL. Une notification POUSSÉE (serveur) qui ne
 * spécifie pas de canal, ou un rappel programmé par un autre chemin, pouvait
 * donc être muette au tout premier lancement. On garantit ici, une fois, que
 * `lumina-default` existe (importance haute) avant le premier envoi.
 *
 * Idempotent : `createChannel` sur un canal existant ne change pas son
 * importance (limite Android) et ne lève pas. No-op hors natif.
 */
import { LocalNotificationAdapter } from "@/adapters/native";
import { LOCAL_NOTIFICATION_CHANNEL_ID } from "@/capabilities/notification/channels";
import { reportError } from "@/lib/observability/errorReporter";

/** Importance Android : IMPORTANCE_HIGH = 4 (heads-up + son). */
export const DEFAULT_CHANNEL_IMPORTANCE = 4;

export async function ensureNotificationChannel(): Promise<void> {
  const local = LocalNotificationAdapter.getInstance();
  if (!local.isNative()) return;
  try {
    await local.createChannel({
      id: LOCAL_NOTIFICATION_CHANNEL_ID,
      name: "Lumina",
      description: "Alertes de transaction, rappels et synchronisation",
      importance: DEFAULT_CHANNEL_IMPORTANCE,
    });
  } catch (e) {
    // L'adaptateur avale déjà les erreurs du plugin ; ceinture + bretelles :
    // un échec de canal ne doit jamais bloquer le démarrage, mais il doit
    // laisser une trace (une notification muette est un défaut invisible).
    reportError(e, {
      type: "functional",
      source: "notifications.ensureChannel",
    });
  }
}
