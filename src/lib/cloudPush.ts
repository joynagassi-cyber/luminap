/**
 * Cloud push — the missing send path for OneSignal push notifications.
 *
 * `notification.sendNotification` persists a row (→ in-app list) and sets
 * OneSignal tags, but nothing ever actually SENT a push: the `onesignal-notify`
 * edge function existed and was never called. This module is the real send path.
 *
 * Design constraints (mirrors the rest of the notification stack):
 *   - **Never throws**: push is optional, so every failure degrades to a
 *     logged `false`. A broken push must never break the write that triggered it.
 *   - **No module-level side effects**: `@/lib/auth` throws at import time when
 *     Supabase env vars are missing (see auth.ts). We therefore import it
 *     LAZILY inside the function so importing this module is always safe
 *     (browser without config, Node tests, SSR).
 *   - **Authenticated**: the edge function rejects anonymous callers (401). With
 *     no session we skip the call entirely rather than send a bogus request.
 */

export interface CloudPushPayload {
  title: string;
  message: string;
  targetRole?: string;
  targetUserId?: string;
  orgId?: string | null;
  extraData?: Record<string, string>;
}

/** Outcome of a cloud push attempt (never an exception). */
export interface CloudPushResult {
  sent: boolean;
  reason?: "no-config" | "no-session" | "error" | "rejected";
  oneSignalId?: string | null;
}

/**
 * Send a cloud push through the `onesignal-notify` edge function.
 *
 * Targeting is resolved server-side from OneSignal tags (role / user_id /
 * org_id) set at login, so a push scoped to an organisation can never reach
 * another tenant.
 */
export async function sendCloudPush(
  payload: CloudPushPayload,
): Promise<CloudPushResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return { sent: false, reason: "no-config" };

  let accessToken: string | undefined;
  try {
    const { authService } = await import("@/lib/auth");
    const session = await authService.getSession();
    accessToken = session?.access_token;
  } catch (e) {
    console.warn("[cloudPush] session indisponible :", e);
    return { sent: false, reason: "no-session" };
  }
  if (!accessToken) return { sent: false, reason: "no-session" };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/onesignal-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        actionType: payload.targetRole ?? "PUSH",
        title: payload.title,
        message: payload.message,
        targetRole: payload.targetRole,
        targetUserId: payload.targetUserId,
        orgId: payload.orgId ?? undefined,
        data: payload.extraData,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("[cloudPush] envoi refusé :", body?.error ?? res.status);
      return { sent: false, reason: "rejected" };
    }

    const body = await res.json().catch(() => ({}));
    return { sent: true, oneSignalId: body?.oneSignalId ?? null };
  } catch (e) {
    console.warn("[cloudPush] échec réseau :", e);
    return { sent: false, reason: "error" };
  }
}
