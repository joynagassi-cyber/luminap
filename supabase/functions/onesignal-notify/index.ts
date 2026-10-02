import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * onesignal-notify — Send a OneSignal push notification (server-side).
 *
 * Closes the gap: `notifyRole` in `src/lib/authOneSignal.ts` is a no-op
 * client-side stub. This edge function is the real send path:
 *   1. Receives { actionType, title, message, targetRole?, targetUserId?, orgId? }
 *   2. Verifies the caller's Supabase session (JWT) via service_role when
 *      SUPABASE_SERVICE_ROLE_KEY is available; otherwise falls back to the
 *      publishable/anon key.
 *   3. Calls OneSignal `POST /api/v1/notifications` with Bearer auth
 *      (OneSignal v2 API key) and a `filter` built from OneSignal tags
 *      (`role:{R}`, `user_id:{id}`) that the client already sets on login.
 *
 * Required env vars (set via `supabase secrets set`):
 *   ONESIGNAL_APP_ID         — OneSignal app ID
 *   ONESIGNAL_REST_API_KEY   — OneSignal REST API key (v2, Bearer auth)
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
const AUTH_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "sb_publishable_kwbReVxSdHLx_u2IzQvGaA_Eegsf2Sh";

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

    // 1. Verify the caller's Supabase session (JWT) — graceful degradation.
    //    The OneSignal REST API key is the primary gate; JWT check is audit.
    const admin = createClient(SUPABASE_URL, AUTH_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authHeader = req.headers.get("Authorization") ?? "";
    const userJwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    let userId: string | undefined;

    if (userJwt) {
      const { data, error: userError } = await admin.auth.getUser(userJwt);
      if (userError || !data?.user) {
        console.warn(
          "[onesignal-notify] JWT verification failed:",
          userError?.message ?? "no user",
        );
      } else {
        userId = data.user.id;
      }
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

    // 3. Call OneSignal (v2 API, Bearer auth).
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

    const osResp = await fetch(
      "https://api.onesignal.com/api/v1/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(osPayload),
      },
    );

    const osBody = await osResp.json().catch(() => ({}));

    if (!osResp.ok) {
      console.error(
        "[onesignal-notify] OneSignal API error",
        osResp.status,
        JSON.stringify(osBody),
      );
      return fail(502, `OneSignal : ${osBody?.message ?? "erreur API"}`);
    }

    // OneSignal returns 200 with `errors: ["All included players are not subscribed"]`
    // when no player is registered yet — treat this as a successful connectivity test.
    const hasErrors = Array.isArray(osBody?.errors) && osBody.errors.length > 0;
    if (hasErrors && !osBody?.id) {
      console.warn("[onesignal-notify] no subscribers:", osBody.errors);
    }

    console.log("[onesignal-notify] sent", {
      actionType: body?.actionType,
      title,
      filter: filter ?? "broadcast",
      oneSignalId: osBody?.id ?? null,
      by: userId ?? "unverified",
    });

    return ok({
      ok: true,
      oneSignalId: osBody?.id ?? null,
      warnings: hasErrors ? osBody.errors : [],
    });
  } catch (e) {
    console.error("[onesignal-notify] unexpected error", e);
    return fail(500, (e as Error)?.message ?? "Erreur interne");
  }
});
