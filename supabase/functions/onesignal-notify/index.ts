import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * onesignal-notify — Send a OneSignal push notification (server-side).
 *
 * Closes the gap: `notifyRole` in `src/lib/authOneSignal.ts` is a no-op
 * client-side stub. This edge function is the real send path:
 *   1. Receives { actionType, title, message, targetRole?, targetUserId?, orgId? }
 *   2. REQUIRES a valid caller JWT (401 otherwise): with the server-side
 *      OneSignal REST key this endpoint would otherwise be an open relay
 *      able to broadcast to every device of every tenant.
 *   3. Calls OneSignal `POST /api/v1/notifications` with Bearer auth
 *      (OneSignal v2 API key) and a `filter` built from OneSignal tags
 *      (`role:{R}`, `user_id:{id}`, `org_id:{org}`) set on the client at login.
 *      A request with NO targeting at all falls back to a full broadcast and
 *      is therefore reserved to a central admin (`org_admins` ACTIVE grant).
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
 *   "orgId": "org-...",              // optional, scopes the push to one tenant
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

type OSFilter = Record<string, string>;

/** Type minimal du client admin (évite d'importer le type Supabase en Deno). */
type AdminClient = ReturnType<typeof createClient>;

/**
 * L'appelant est-il ADMIN CENTRAL ? Deux chemins (cf. R-D) :
 *   1. grant `org_admins` ACTIVE sur `org-central` ;
 *   2. `profiles.role='ADMIN'` rattaché à `org-central`.
 * NE PAS élargir à « ADMIN d'une org racine » : toute église self-serve a
 * `parent_org_id IS NULL`, ce critère autoriserait un admin d'église à diffuser
 * à TOUS les tenants (escalade mesurée).
 */
async function isCentralAdmin(admin: AdminClient, userId: string): Promise<boolean> {
  const { data: grants } = await admin
    .from("org_admins")
    .select("id")
    .eq("admin_profile_id", userId)
    .eq("org_id", "org-central")
    .eq("status", "ACTIVE")
    .limit(1);
  if ((grants?.length ?? 0) > 0) return true;
  const { data: prof } = await admin
    .from("profiles")
    .select("role, org_id")
    .eq("id", userId)
    .maybeSingle();
  return prof?.role === "ADMIN" && prof?.org_id === "org-central";
}

/**
 * L'appelant appartient-il à `orgId` ? Miroir serveur de `is_org_member` :
 * `profiles.org_id` (org primaire) ∪ `org_memberships` ACTIVE/PENDING ∪
 * `org_admins` ACTIVE. Couvre le cas multi-org (membre d'une org secondaire).
 */
async function isMemberOfOrg(
  admin: AdminClient,
  userId: string,
  orgId: string | undefined | null,
): Promise<boolean> {
  if (!orgId || orgId === "__no_org__" || orgId === "no-org") return false;

  const { data: prof } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.org_id === orgId) return true;

  const { data: memberships } = await admin
    .from("org_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .in("status", ["ACTIVE", "PENDING"])
    .limit(1);
  if ((memberships?.length ?? 0) > 0) return true;

  const { data: grants } = await admin
    .from("org_admins")
    .select("id")
    .eq("admin_profile_id", userId)
    .eq("org_id", orgId)
    .eq("status", "ACTIVE")
    .limit(1);
  return (grants?.length ?? 0) > 0;
}

/**
 * Build the OneSignal v2 `filters` array from targetRole / targetUserId / orgId.
 *
 * The OneSignal REST API expects `filters` (an ARRAY of tag predicates joined
 * by explicit `{ operator: "AND" }` entries) — NOT a string field named
 * `filter`. The previous single-string form made every targeted push fail with
 * HTTP 400 "You must include which players, segments, or tags you wish to send
 * this notification to", so `notifyRole` never delivered anything.
 *
 * Without any targeting the caller would fall back to `included_segments:
 * ["All"]`, which reaches every device of every tenant — cross-tenant by
 * construction. That path is therefore reserved to a central admin.
 */
function buildFilters(
  targetRole?: string,
  targetUserId?: string,
  orgId?: string,
): OSFilter[] | undefined {
  const predicates: OSFilter[] = [];
  if (targetUserId) {
    predicates.push({ field: "tag", key: "user_id", relation: "=", value: targetUserId });
  }
  if (targetRole) {
    predicates.push({ field: "tag", key: "role", relation: "=", value: targetRole });
  }
  if (orgId) {
    predicates.push({ field: "tag", key: "org_id", relation: "=", value: orgId });
  }
  if (predicates.length === 0) return undefined;

  const filters: OSFilter[] = [];
  predicates.forEach((p, i) => {
    if (i > 0) filters.push({ operator: "AND" });
    filters.push(p);
  });
  return filters;
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

    // 1. Authenticate the caller. This function fans out push notifications
    //    with the server-side OneSignal REST key, so an anonymous caller must
    //    never be able to reach it (otherwise it is an open notification relay:
    //    `included_segments: ["All"]` reaches every device of every tenant).
    const admin = createClient(SUPABASE_URL, AUTH_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authHeader = req.headers.get("Authorization") ?? "";
    const userJwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!userJwt) {
      return fail(401, "Non authentifié");
    }
    const { data: authData, error: userError } = await admin.auth.getUser(userJwt);
    if (userError || !authData?.user) {
      return fail(401, "Session invalide ou expirée");
    }
    const userId = authData.user.id;

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

    const filters = buildFilters(body?.targetRole, body?.targetUserId, body?.orgId);

    // 2bis. Autorisation de l'envoi.
    //
    // CLOISONNEMENT PAR ORGANISATION (correctif) : l'appelant ne peut cibler que
    // SA propre organisation. Sans cette garde, tout utilisateur authentifié
    // pouvait forger un appel `{ targetRole: "TREASURIER" }` SANS `orgId` et
    // déclencher un push sur les trésoriers de TOUS les tenants — hameçonnage /
    // injection de notification inter-organisations (le seul frein était le
    // ciblage, non vérifié).
    //
    // Règle : le ciblage est restreint aux organisations de l'appelant (org
    // primaire ∪ memberships ∪ grants admin, cf. `isMemberOfOrg`). Seul un
    // ADMIN CENTRAL peut cibler une AUTRE organisation (ou diffuser à « All »).
    const central = await isCentralAdmin(admin, userId);
    if (!central && body?.orgId) {
      const member = await isMemberOfOrg(admin, userId, body.orgId);
      if (!member) {
        // Tentative de cibler une organisation dont l'appelant n'est pas membre.
        return fail(403, "Ciblage limité à vos organisations");
      }
    }

    if (!filters) {
      // Aucun ciblage → OneSignal diffuserait à « All » (tous les tenants).
      // Réservé à un admin CENTRAL : un admin d'organisation doit scoper son
      // push à un rôle, un utilisateur ou sa propre organisation.
      if (!central) {
        return fail(403, "Ciblage requis (rôle, utilisateur ou organisation)");
      }
    }

    // 3. Call OneSignal (v2 API, Bearer auth).
    const osPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      // `included_segments: ["All"]` targets everyone when no filter is set.
      ...(!filters ? { included_segments: ["All"] } : {}),
      ...(filters ? { filters } : {}),
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
      filter: filters ?? "broadcast",
      oneSignalId: osBody?.id ?? null,
      by: userId,
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
