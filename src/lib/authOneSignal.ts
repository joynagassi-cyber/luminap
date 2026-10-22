/**
 * OneSignal Integration with Authentication
 * Connects Supabase auth to OneSignal push notifications
 *
 * Uses src/lib/onesignal.ts for the actual implementation,
 * which handles both Capacitor native and web environments.
 */
import { getOneSignalService, initOneSignal } from "./onesignal";
import { authService } from "./auth";
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

  async login(role: Role, userId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    try {
      const service = getOneSignalService();
      await service.login(userId);
      await service.setTag("role", role);
      await service.setTag("user_id", userId);
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
    // Delegate to the OneSignal edge function for server-side push.
    // The edge function resolves targeting from OneSignal tags (role, user_id)
    // already set on the current player during login.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return; // Silent no-op if Supabase env missing

    const res = await fetch(
      `${supabaseUrl}/functions/v1/onesignal-notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${this.getUserId() ?? ""}`,
        },
        body: JSON.stringify({
          actionType: "ROLE_NOTIFY",
          title,
          message,
          targetRole: role,
          data,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("[authOneSignal] notifyRole failed:", body?.error ?? res.status);
    }
  }
}

export const oneSignalService = new OneSignalAuthService();
export function useOneSignal() {
  return oneSignalService;
}
