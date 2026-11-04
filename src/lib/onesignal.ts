/**
 * OneSignal Service for Lumina App
 *
 * A2 (audit permissions) — transport réel : pont Capacitor maison
 * `OneSignalBridge` (android/.../OneSignalBridgePlugin.java) sur le SDK
 * Android OneSignal 4.8.12 déjà intégré à Gradle. L'ancien code visait,
 * via le pont Cordova générique, un plugin « OneSignalPush » jamais
 * installé : tout était inerte (l'appareil ne s'enregistrait jamais
 * comme joueur, les tags n'atteignaient jamais OneSignal). Le plugin
 * officiel (onesignal-cordova-plugin 5.6.2 → SDK 5.11.0) est écarté :
 * sa dépendance transitive `bcprov-jdk18on:1.79` casse le build Gradle
 * (voir le commentaire dans android/app/build.gradle).
 *
 * L'ENVOI des pushes ne passe pas par ici : il est server-side
 * (cloudPush → Edge Function `onesignal-notify` → REST OneSignal, ciblé
 * par tags rôle/user/org). Ce module gère la partie appareil :
 * initialisation du SDK, identité externe, tags de ciblage.
 *
 * La permission POST_NOTIFICATIONS se demande via PermissionService
 * (src/lib/permissionService) — porte unique côté UI (audit §1.4).
 *
 * OneSignal App ID: 5482a4eb-a402-4612-ab5e-a72df7961b12 (env
 * VITE_ONESIGNAL_APP_ID ; même valeur en resValue Gradle).
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { isFeatureEnabled } from "./featureFlags";
import { reportError } from "./observability/errorReporter";

interface OneSignalBridgePlugin {
  initialize(options: { appId: string }): Promise<void>;
  login(options: { externalId: string }): Promise<void>;
  logout(): Promise<void>;
  setTags(options: { tags: Record<string, string> }): Promise<void>;
  deleteTags(options: { keys: string[] }): Promise<void>;
}

const OneSignalBridge =
  registerPlugin<OneSignalBridgePlugin>("OneSignalBridge");

/**
 * Miroir local des tags posés par l'app sur le joueur de cet appareil.
 * Le SDK 4.8 ne relit pas les tags de façon fiable/simple côté pont ;
 * comme seuls les tags écrits par CETTE app sont relus (liste `topics`
 * en lecture-modification-écriture), le miroir Preferences fait foi.
 * Les tags de ciblage critiques (role/user_id/org_id) sont de toute
 * façon ré-émis à chaque login. Le miroir appartient à l'appareil
 * (comme les tags du joueur OneSignal) : il survit donc au logout.
 */
const TAG_MIRROR_KEY = "lumina.onesignal.tags";

export class OneSignalService {
  private isInitialized = false;
  private tagMirror: Record<string, string> | null = null;

  constructor(private readonly appId: string) {}

  /** Pont natif joignable ? (App ID configurée + plateforme native.) */
  private get bridgeAvailable(): boolean {
    return this.appId !== "" && Capacitor.isNativePlatform();
  }

  /**
   * Initialize OneSignal SDK. Idempotent ; ne rejette jamais (le push
   * ne doit casser ni le login ni les réglages) mais signale l'échec.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.bridgeAvailable) return;
    try {
      await OneSignalBridge.initialize({ appId: this.appId });
      this.isInitialized = true;
    } catch (error) {
      reportError(error, { source: "onesignal-initialize" });
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Demande la permission système de notifications.
   *
   * Porte canonique côté UI : PermissionService (statuts typés, écran
   * d'explication, historique des demandes). Cette méthode reste le
   * transport historique du service — la fenêtre système est la même
   * (POST_NOTIFICATIONS via LocalNotifications) et le SDK OneSignal,
   * déjà initialisé, observe le résultat pour le joueur.
   */
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch {
      return false;
    }
  }

  /** Associe le joueur de cet appareil à l'identité externe (user id). */
  async login(externalId: string): Promise<void> {
    if (!this.bridgeAvailable) return;
    await this.initialize();
    if (!this.isInitialized) return;
    try {
      await OneSignalBridge.login({ externalId });
    } catch {
      // Non bloquant : ré-émis à chaque login (auto-réparation).
    }
  }

  /** Dissocie le joueur de l'identité externe. */
  async logout(): Promise<void> {
    if (!this.bridgeAvailable) return;
    await this.initialize();
    if (!this.isInitialized) return;
    try {
      await OneSignalBridge.logout();
    } catch {
      // Non bloquant.
    }
  }

  /** Pose un tag sur le joueur (miroir local + SDK). */
  async setTag(key: string, value: string): Promise<void> {
    await this.setTags({ [key]: value });
  }

  /** Pose plusieurs tags sur le joueur (miroir local + SDK). */
  async setTags(tags: Record<string, string>): Promise<void> {
    const mirror = await this.loadTagMirror();
    Object.assign(mirror, tags);
    await this.persistTagMirror();
    if (!this.bridgeAvailable) return;
    await this.initialize();
    if (!this.isInitialized) return;
    try {
      await OneSignalBridge.setTags({ tags });
    } catch {
      // Métadonnées de ciblage : ré-émises au prochain login/setTags.
    }
  }

  /** Retire un tag du joueur (miroir local + SDK). */
  async removeTag(key: string): Promise<void> {
    const mirror = await this.loadTagMirror();
    delete mirror[key];
    await this.persistTagMirror();
    if (!this.bridgeAvailable) return;
    await this.initialize();
    if (!this.isInitialized) return;
    try {
      await OneSignalBridge.deleteTags({ keys: [key] });
    } catch {
      // Non bloquant.
    }
  }

  /** Tags connus de cet appareil (miroir local, copie défensive). */
  async getTags(): Promise<Record<string, string>> {
    return { ...(await this.loadTagMirror()) };
  }

  private async loadTagMirror(): Promise<Record<string, string>> {
    if (this.tagMirror) return this.tagMirror;
    try {
      const { value } = await Preferences.get({ key: TAG_MIRROR_KEY });
      this.tagMirror = value
        ? (JSON.parse(value) as Record<string, string>)
        : {};
    } catch {
      this.tagMirror = {};
    }
    return this.tagMirror;
  }

  private async persistTagMirror(): Promise<void> {
    try {
      await Preferences.set({
        key: TAG_MIRROR_KEY,
        value: JSON.stringify(this.tagMirror ?? {}),
      });
    } catch {
      // Best-effort : le miroir mémoire reste valable pour la session.
    }
  }
}

// Singleton instance
let instance: OneSignalService | null = null;

/**
 * Get or create the OneSignal service instance
 */
export function getOneSignalService(): OneSignalService {
  if (!instance) {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) {
      // Push optionnel : sans App ID (build CI, dev sans config) on retourne
      // un service « débranché ». Chaque méthode est gardée par
      // `bridgeAvailable` (faux sans App ID ou hors natif), donc tout est
      // no-op. Un `throw` ici casserait les pages qui importent le
      // service sans jamais toucher aux notifications.
      console.warn(
        "[onesignal] VITE_ONESIGNAL_APP_ID manquante : notifications push désactivées (no-op).",
      );
    }
    instance = new OneSignalService(appId ?? "");
  }
  return instance;
}

/**
 * Initialize OneSignal (call this once at app startup)
 *
 * Kill switch PR7 : le drapeau `notifications-push` (défaut actif) permet de
 * couper l'initialisation push en production sans redéploiement — utile si le
 * plugin provoque un crash au démarrage. Fail-open : sans drapeau, comportement
 * inchangé.
 */
export async function initOneSignal(): Promise<void> {
  if (!isFeatureEnabled("notifications-push")) {
    console.warn("[onesignal] drapeau `notifications-push` désactivé : push no-op.");
    return;
  }
  const service = getOneSignalService();
  await service.initialize();
}
