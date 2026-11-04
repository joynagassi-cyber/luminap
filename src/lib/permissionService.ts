/**
 * PermissionService — porte unique des permissions runtime (audit §1.4, A2).
 *
 * Règles (non négociables) :
 * - aucune demande de permission en dehors de ce module ;
 * - jamais au démarrage à froid : la première demande passe par l'écran
 *   d'explication (`PermissionPrimerGate`), au moment du bénéfice ;
 * - chaque refus/report est mémorisé (Preferences) : nouvel essai au plus
 *   tôt 7 jours plus tard, et seulement depuis un geste explicite ou le
 *   primer — jamais de redemande en boucle ;
 * - permission bloquée (refus définitif Android) → l'UI propose les
 *   réglages système (`openAppSettings`) au lieu de redemander en vain ;
 * - ce module ne rejette jamais : statuts typés + `reportError`.
 *
 * Périmètre actuel : `notifications` seulement — la caméra n'a besoin
 * d'aucune permission runtime (intent système, P-02) et les alarmes
 * exactes ne sont pas utilisées (planification inexacte, P-04). Le
 * paramètre `name` est conservé pour étendre sans changer les appels.
 *
 * Android < 13 : POST_NOTIFICATIONS n'existe pas — `checkPermissions`
 * reflète alors l'état « notifications activées » des réglages ; la
 * demande résout sans fenêtre (audit règle 3).
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import {
  AndroidSettings,
  IOSSettings,
  NativeSettings,
} from "capacitor-native-settings";
import { initOneSignal } from "@/lib/onesignal";
import { reportError } from "@/lib/observability/errorReporter";

export type PermissionName = "notifications";

export type PermissionStatus =
  | "granted" // autorisée — rien à faire, jamais redemander
  | "denied" // refusée, mais la fenêtre système peut encore s'afficher
  | "blocked" // refus définitif — seuls les réglages système débloquent
  | "prompt" // jamais demandée (ou redemandable) — fenêtre affichable
  | "unavailable"; // web / plugin injoignable — l'UI masque ou dégrade

const ASKED_AT_KEY = "lumina.perm.notif.askedAt";
const DEFERRED_AT_KEY = "lumina.perm.notif.deferredAt";

/** Délai minimal avant de reproposer après un refus ou un « plus tard ». */
export const ASK_AGAIN_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Logique pure (testée unitairement) ──────────────────────────────

/**
 * Traduit l'état Capacitor (`display`) en statut produit. Android ne
 * distingue pas « refusé une fois » de « refusé définitivement » : un
 * `denied` alors qu'on a déjà demandé (et donc déjà essuyé un refus,
 * la fenêtre ne réapparaîtra plus) est traité comme `blocked`.
 */
export function mapDisplayToStatus(
  display: string,
  hasAsked: boolean,
): PermissionStatus {
  switch (display) {
    case "granted":
      return "granted";
    case "prompt":
    case "prompt-with-rationale":
      return "prompt";
    case "denied":
      return hasAsked ? "blocked" : "denied";
    default:
      return "unavailable";
  }
}

/** Peut-on (re)proposer la permission maintenant ? */
export function computeShouldAsk(args: {
  status: PermissionStatus;
  lastInteractionAt: number | null;
  now: number;
}): boolean {
  const { status, lastInteractionAt, now } = args;
  if (status === "granted" || status === "blocked" || status === "unavailable") {
    return false;
  }
  if (lastInteractionAt == null) return true;
  return now - lastInteractionAt >= ASK_AGAIN_DELAY_MS;
}

export interface PrimerEligibilityInput {
  isNative: boolean;
  status: PermissionStatus;
  lastInteractionAt: number | null;
  now: number;
  /** Le bénéfice est vécu : au moins une transaction enregistrée. */
  hasTransaction: boolean;
  /** Écran calme (dashboard/finance) — jamais au milieu d'un formulaire. */
  routeEligible: boolean;
}

/** L'écran d'explication peut-il s'afficher maintenant ? */
export function isPrimerEligible(input: PrimerEligibilityInput): boolean {
  return (
    input.isNative &&
    input.hasTransaction &&
    input.routeEligible &&
    computeShouldAsk({
      status: input.status,
      lastInteractionAt: input.lastInteractionAt,
      now: input.now,
    })
  );
}

// ─── Persistance (Preferences — survit au nettoyage du WebView) ──────

async function readTimestamp(key: string): Promise<number | null> {
  try {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeTimestamp(key: string, at: number): Promise<void> {
  try {
    await Preferences.set({ key, value: String(at) });
  } catch {
    // Best-effort : au pire, le primer se représentera plus tôt.
  }
}

/** Dernière interaction (demande système ou « plus tard »), ou null. */
export async function lastInteractionAt(
  name: PermissionName,
): Promise<number | null> {
  void name; // notifications uniquement pour l'instant (voir l'en-tête)
  const [asked, deferred] = await Promise.all([
    readTimestamp(ASKED_AT_KEY),
    readTimestamp(DEFERRED_AT_KEY),
  ]);
  const known = [asked, deferred].filter(
    (value): value is number => value != null,
  );
  return known.length > 0 ? Math.max(...known) : null;
}

// ─── API du service ──────────────────────────────────────────────────

/** Statut courant, sans jamais afficher de fenêtre. */
export async function check(name: PermissionName): Promise<PermissionStatus> {
  void name;
  if (!Capacitor.isNativePlatform()) return "unavailable";
  try {
    const askedAt = await readTimestamp(ASKED_AT_KEY);
    const { display } = await LocalNotifications.checkPermissions();
    return mapDisplayToStatus(display, askedAt != null);
  } catch (error) {
    reportError(error, { source: "permission-check" });
    return "unavailable";
  }
}

/**
 * Affiche la fenêtre système (à n'appeler que depuis un geste explicite
 * ou le primer) et retourne le statut résultant. Le SDK OneSignal est
 * initialisé juste avant pour qu'il observe l'issue et enregistre
 * l'appareil ; la fenêtre elle-même est celle de POST_NOTIFICATIONS.
 */
export async function request(
  name: PermissionName,
): Promise<PermissionStatus> {
  void name;
  if (!Capacitor.isNativePlatform()) return "unavailable";
  try {
    await initOneSignal();
    await LocalNotifications.requestPermissions();
  } catch (error) {
    reportError(error, { source: "permission-request" });
  }
  await writeTimestamp(ASKED_AT_KEY, Date.now());
  return check("notifications");
}

/** Le primer/une relance douce peut-il être proposé maintenant ? */
export async function shouldAsk(name: PermissionName): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const [status, last] = await Promise.all([
    check(name),
    lastInteractionAt(name),
  ]);
  return computeShouldAsk({ status, lastInteractionAt: last, now: Date.now() });
}

/** Mémorise un « plus tard » (repousse toute reproposition de 7 jours). */
export async function recordDeferral(name: PermissionName): Promise<void> {
  void name;
  await writeTimestamp(DEFERRED_AT_KEY, Date.now());
}

/** Ouvre les réglages système de l'application (cas `blocked`). */
export async function openAppSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
  } catch (error) {
    reportError(error, { source: "permission-open-settings" });
  }
}

/** Façade objet (forme de l'audit §1.4). */
export const permissions = {
  check,
  request,
  shouldAsk,
  recordDeferral,
  lastInteractionAt,
  openAppSettings,
};
