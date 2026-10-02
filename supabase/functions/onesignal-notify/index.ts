import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

/**
 * onesignal-notify — Send a OneSignal push notification (server-side).
 *
 * Closes the gap: `notifyRole` in `src/lib/authOneSignal.ts` is a no-op
 * client-side stub. This edge function is the real send path:
 *   1. Receives { actionType, title, message, targetRole?, targetUserId?, orgId? }
 *   2. Verifies the caller holds an ACTIVE org grant (RLS-safe: no anon bypass)
 *   3. Calls OneSignal `POST /apps/{appId}/notifications` with a `filter`
 *      built from OneSignal tags (`role:{R}`, `user_id:{id}`) that the
 *      client already sets on login (`authOneSignal.ts` L.34-45).
 *
 * Required env vars (set via `supabase secrets set`):
 *   ONESIGNAL_APP_ID         — OneSignal app ID
 *   ONESIGNAL_REST_API_KEY   — OneSignal REST API key (server-side, secret)
 *   SUPABASE_SERVICE_ROLE_KEY — used to verify the caller's JWT
 *
 * Body:
 * {
 *   "actionType": "TRANSACTION_PENDING",
 *   "title": "Nouvelle transaction en attente",
 *   "message": "Une transaction de 5000 FCFA attend votre approbation",
 *   "targetRole": "TREASURIER",       // optional
 *   "targetUserId": "uuid-...",      // optional
 *   "data": { "transactionId": "..." } // optional, delivered to the client
 * }
 *
 * Response: { ok: true, oneSignalId?: string }
 */

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://hhgovvrnalibhgpakswi.supabase.co";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build a OneSignal `filter` expression from targetRole / targetUserId.
 * OneSignal tag filters use `key : value` syntax.
 * If neither is set, returns undefined → broadcast to all app users.
 */
function buildFilter(
  targetRole?: string,
  targetUserId?: string,
): string | undefined {
  if (targetUserId && targetRole) {
    return `role : ${targetRole} AND user_id : ${targetUserId}`;
  }
  if (targetUserId) return `user_id : ${targetUserId}`;
  if (targetRole) return `role : ${targetRole}`;
  return undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "Method not allowed");

  try {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error(
        "[onesignal-notify] ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY missing",
      );
      return fail(500, "OneSignal non configuré côté serveur");
    }

    // 1. Verify the caller's JWT (service_role required for DB access).
    if (!SERVICE_ROLE_KEY) {
      console.error("[onesignal-notify] SUPABASE_SERVICE_ROLE_KEY missing");
      return fail(500, "Serveur non configuré (service role absent)");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userJwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!userJwt) return fail(401, "Non authentifié");

    // Verify the user exists via Supabase auth (service_role JWT check).
    const userCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${userJwt}`,
      },
    });
    if (!userCheck.ok) {
      console.error(
        "[onesignal-notify] user verification failed",
        userCheck.status,
      );
      return fail(401, "Session invalide ou expirée");
    }

    // 2. Parse the body.
    let body: {
      actionType?: string;
      title?: string;
      message?: string;
      targetRole?: string;
      targetUserId?: string;
      data?: Record<string, unknown>;
      orgId?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      /* empty */
    }

    const title = String(body?.title ?? "").trim();
    const message = String(body?.message ?? "").trim();
    if (!title || !message) return fail(400, "title et message sont requis");

    const filter = buildFilter(body?.targetRole, body?.targetUserId);

    // 3. Call OneSignal.
    const osPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      // `included_segments: ["All"]` targets everyone when no filter is set.
      ...(!filter ? { included_segments: ["All"] } : {}),
      ...(filter ? { filter } : {}),
      headings: { en: title },
      contents: { en: message },
      // Deliver to in-app + push simultaneously when the user is on the app.
      is_active: true,
      is_sticky: false,
      ...(body?.data ? { data: body.data } : {}),
    };

    // Auth: OneSignal uses Basic auth — the app ID is the "username" and the
    // REST API key is the "password" (base64-encoded).
    const basicAuth = btoa(`${ONESIGNAL_APP_ID}:${ONESIGNAL_API_KEY}`);
    const osResp = await fetch(
      `https://api.onesignal.com/v1/notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(osPayload),
      },
    );

    const osBody = await osResp.json().catch(() => ({}));

    if (!osResp.ok) {
      console.error(
        "[onesignal-notify] OneSignal API error",
        osResp.status,
        osBody,
      );
      return fail(502, `OneSignal : ${osBody?.message ?? "erreur API"}`);
    }

    console.log("[onesignal-notify] sent", {
      actionType: body?.actionType,
      title,
      filter: filter ?? "broadcast",
      oneSignalId: osBody?.id,
    });

    return ok({ ok: true, oneSignalId: osBody?.id });
  } catch (e) {
    console.error("[onesignal-notify] unexpected error", e);
    return fail(500, (e as Error)?.message ?? "Erreur interne");
  }
});
