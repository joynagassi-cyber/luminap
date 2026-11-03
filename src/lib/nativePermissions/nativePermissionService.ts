/**
 * PermissionService — le SEUL point d'entrée pour les permissions d'exécution
 * Android (et iOS plus tard).
 *
 * Règles (voir docs/lumina-ionic-capacitor-permissions.md §1.4) :
 *  1. `request()` ne doit être appelé qu'après un écran d'explication
 *     (`PermissionPrimer`) — jamais au démarrage à froid.
 *  2. Aucune exception silencieuse : chaque méthode renvoie un
 *     `PermissionStatus` typé, et les erreurs inattendues sont remontées via
 *     `reportError`.
 *  3. `blocked` = Android ne réaffichera plus la fenêtre systême (refus
 *     définitif) → l'interface doit proposer « Ouvrir les réglages ».
 *  4. Android < 13 : `POST_NOTIFICATIONS` n'existe pas → `check()` renvoie
 *     `granted` (le plugin push fait la même chose côté natif).
 *
 * Le service s'appuie sur `@capacitor/push-notifications` (seule pile dont la
 * demande de `POST_NOTIFICATIONS` est vérifiée fonctionnelle) et NON sur le
 * pont OneSignal manuel de `src/lib/onesignal.ts` (API inexistante, cf. P-01).
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import { reportError } from "@/lib/observability/errorReporter";

export type PermissionName = "notifications" | "camera" | "exactAlarm";

export type PermissionStatus =
  | "granted"
  | "denied"
  | "blocked"
  | "prompt"
  | "unavailable";

/** Clé du compteur de refus (anti-harcèlement) par permission. */
const denialKey = (name: PermissionName) => `lumina-perm-denials-${name}`;
/** Clé de la date du dernier report (« Plus tard ») par permission. */
const snoozeKey = (name: PermissionName) => `lumina-perm-snooze-${name}`;

/** Délai de report après un « Plus tard » : 7 jours. */
export const SNOOZE_DAYS = 7;
/** Nombre de refus après lequel on considère la permission bloquée. */
export const MAX_DENIALS_BEFORE_BLOCKED = 2;

// ─── État pur (testable sans appareil) ───────────────────────────────────────

/**
 * Traduit l'état brut du plugin (`granted` / `denied` / `prompt` /
 * `prompt-with-rationale` / `limited`) en statut métier, en tenant compte du
 * nombre de refus déjà enregistrés : sur Android, après un refus définitif,
 * le plugin renvoie encore `denied` alors qu'aucune fenêtre ne peut plus
 * apparaître — d'où la promotion en `blocked`.
 */
export function resolveStatus(
  raw: string | undefined,
  denials: number,
): PermissionStatus {
  switch (raw) {
    case "granted":
      return "granted";
    case "limited":
      return "granted";
    case "prompt":
    case "prompt-with-rationale":
      return "prompt";
    case "denied":
      return denials >= MAX_DENIALS_BEFORE_BLOCKED ? "blocked" : "denied";
    case "unavailable":
      return "unavailable";
    default:
      // Plugin muet (pas de valeur) : on ne prétend ni accordé, ni refusé.
      return "unavailable";
  }
}

/** Vrai si le report « Plus tard » est encore actif à l'instant `now`. */
export function isSnoozed(until: number | null, now = Date.now()): boolean {
  return until !== null && until > now;
}

// ─── Accès stockage (Preferences, repli localStorage) ────────────────────────

async function readNumber(key: string): Promise<number | null> {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      if (value === null) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function writeNumber(key: string, value: number): Promise<void> {
  try {
    if (isNative()) {
      await Preferences.set({ key, value: String(value) });
      return;
    }
  } catch {
    /* repli ci-dessous */
  }
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* stockage indisponible : le compteur est perdu, jamais bloquant */
  }
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

export class PermissionService {
  /** Nombre de refus enregistrés pour une permission. */
  async denials(name: PermissionName): Promise<number> {
    return (await readNumber(denialKey(name))) ?? 0;
  }

  /**
   * État courant, SANS afficher de fenêtre système.
   * `notifications` : `granted` hors Android 13+ (aucune permission
   * d'exécution) — comportement du plugin natif, vérifié dans
   * `PushNotificationsPlugin.checkPermissions`.
   */
  async check(name: PermissionName): Promise<PermissionStatus> {
    if (name !== "notifications") {
      // `camera` n'est jamais requis (photo par l'app système) et
      // `exactAlarm` non plus (dégradation automatique du plugin local).
      // On ne simule donc pas un état : la permission est sans objet.
      return "unavailable";
    }
    if (!isNative()) return "unavailable";
    try {
      const status = await PushNotifications.checkPermissions();
      return resolveStatus(status?.receive, await this.denials(name));
    } catch (e) {
      reportError(e, {
        type: "functional",
        source: "permissions.check",
      });
      return "unavailable";
    }
  }

  /**
   * Demande l'accès. Ne doit être appelé qu'APRÈS un écran d'explication.
   * Sur web (ou plugin absent), renvoie `unavailable` — jamais `granted`.
   */
  async request(name: PermissionName): Promise<PermissionStatus> {
    if (name !== "notifications") return "unavailable";
    if (!isNative()) return "unavailable";

    const before = await this.check(name);
    if (before === "granted") return "granted";
    if (before === "blocked") return "blocked";

    try {
      const status = await PushNotifications.requestPermissions();
      const resolved = resolveStatus(status?.receive, await this.denials(name));
      if (resolved === "denied" || resolved === "blocked") {
        await this.recordDenial(name);
        // Recalcul avec le compteur à jour : 2 refus ⇒ bloqué.
        return resolveStatus(status?.receive, await this.denials(name));
      }
      if (resolved === "granted") {
        await writeNumber(denialKey(name), 0);
      }
      return resolved;
    } catch (e) {
      reportError(e, {
        type: "functional",
        source: "permissions.request",
      });
      return "unavailable";
    }
  }

  /** Enregistre un refus (utilisé par `request` et par les tests). */
  async recordDenial(name: PermissionName): Promise<number> {
    const next = (await this.denials(name)) + 1;
    await writeNumber(denialKey(name), next);
    return next;
  }

  /**
   * Faut-il proposer la demande MAINTENANT ? (anti-harcèlement)
   *  - jamais si déjà accordé, bloqué ou sans objet ;
   *  - jamais pendant un report « Plus tard » encore actif.
   */
  async shouldAsk(name: PermissionName): Promise<boolean> {
    const status = await this.check(name);
    if (status === "granted" || status === "blocked" || status === "unavailable") {
      return false;
    }
    const until = await readNumber(snoozeKey(name));
    return !isSnoozed(until);
  }

  /** Reporte la prochaine proposition de `days` jours (défaut : 7). */
  async snooze(name: PermissionName, days = SNOOZE_DAYS): Promise<void> {
    await writeNumber(snoozeKey(name), Date.now() + days * 86_400_000);
  }

  /**
   * Ouvre les réglages Android de l'application.
   *
   * Aucun plugin installé n'expose cette action (`@capacitor/app` n'a pas
   * `openUrl`). On passe donc par une méthode native AJOUTÉE au plugin déjà
   * enregistré `ApkUpdater` (`openAppSettings`), sans nouvelle permission ni
   * nouvelle dépendance. En son absence, on ne fait rien et on le signale.
   */
  async openAppSettings(): Promise<boolean> {
    if (!isNative()) return false;
    try {
      const plugin = (Capacitor as unknown as {
        Plugins?: Record<string, { openAppSettings?: () => Promise<void> }>;
      }).Plugins?.ApkUpdater;
      if (!plugin?.openAppSettings) {
        reportError(
          new Error("openAppSettings absent du plugin natif ApkUpdater"),
          { type: "functional", source: "permissions.openAppSettings" },
        );
        return false;
      }
      await plugin.openAppSettings();
      return true;
    } catch (e) {
      reportError(e, {
        type: "functional",
        source: "permissions.openAppSettings",
      });
      return false;
    }
  }
}

/** Singleton — le service est sans état (tout est persisté). */
export const permissionService = new PermissionService();
