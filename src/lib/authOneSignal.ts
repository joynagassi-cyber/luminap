/**
 * OneSignal Integration with Authentication
 * Connects Supabase auth to OneSignal push notifications
 *
 * Uses src/lib/onesignal.ts for the actual implementation,
 * which handles both Capacitor native and web environments.
 */
import { getOneSignalService, initOneSignal } from "./onesignal";
import { getOrganizationId } from "./orgContext";
import type { Role } from "@/types";

// OneSignal est optionnel (push) : l'absence d'App ID ne doit PAS lever au
// chargement du module. Un `throw` ici s'exécute dès l'import et fait planter
// tout chunk qui importe ce fichier (AuthPage, AppContext) — y compris des
// pages sans rapport avec les notifications. getOneSignalService() dégrade en
// no-op quand l'App ID est absent.
if (!import.meta.env.VITE_ONESIGNAL_APP_ID) {
  console.warn(
    "[authOneSignal] VITE_ONESIGNAL_APP_ID manquante : synchronisation auth/OneSignal désactivée (no-op).",
  );
}

// OneSignal service class (delegates to src/lib/onesignal.ts)
class OneSignalAuthService {
  private isInitialized = false;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await initOneSignal();
      this.isInitialized = true;
    } catch (error) {
      // Initialization failed — will retry on next call
    }
  }

  /**
   * Tag the current player with the organisation it belongs to. The
   * `onesignal-notify` edge function targets pushes by `org_id`, so a push
   * intended for one tenant can never reach another.
   */
  async login(role: Role, userId: string, orgId?: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    try {
      const service = getOneSignalService();
      await service.login(userId);
      await service.setTag("role", role);
      await service.setTag("user_id", userId);
      const org = orgId ?? getOrganizationId();
      if (org) await service.setTag("org_id", org);
      this.userId = userId;
    } catch (error) {
      // Tag sync failure is non-fatal
    }
  }

  async logout(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      const service = getOneSignalService();
      await service.logout();
      this.userId = null;
    } catch (error) {
      // Logout failure is non-fatal
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const service = getOneSignalService();
      return await service.requestPermission();
    } catch (error) {
      return false;
    }
  }

  getUserId(): string | null {
    return this.userId;
  }

  async notifyRole(
    role: Role,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // Delegate to the shared cloud-push module (single send path). The edge
    // function resolves targeting from OneSignal tags (role, org_id) set on
    // each player during login and requires a valid Supabase session.
    const { sendCloudPush } = await import("./cloudPush");
    await sendCloudPush({
      title,
      message,
      targetRole: role,
      orgId: getOrganizationId(),
      extraData: data as Record<string, string> | undefined,
    });
  }
}

export const oneSignalService = new OneSignalAuthService();
export function useOneSignal() {
  return oneSignalService;
}
