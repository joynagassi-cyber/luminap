import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * create_org — bootstrap an *usable* organization (service_role).
 *
 * RLS makes it impossible to create the first org / first admin from the
 * client (organizations INSERT + org_admins INSERT both require an ACTIVE
 * central-admin grant that does not exist yet). This edge function runs with
 * the service_role key so it can:
 *   1. verify the caller's session (JWT),
 *   2. gate on the caller holding an ACTIVE `org_admins` grant,
 *   3. create the org row (status ACTIVE) and grant the creator admin on it.
 *
 * Once the creator is an admin of the new org, the normal app UI (RLS-scoped
 * to that org) lets them seed caisses/groups/categories and invite members via
 * the invitation flow.
 *
 * The VERY FIRST central admin is seeded by the project owner with service_role
 * SQL (see AI_RULES / project docs); this function then lets that admin create
 * further organizations.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl =
  Deno.env.get("SUPABASE_URL") ??
  "https://hhgovvrnalibhgpakswi.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

const VALID_TYPES = ["CHURCH", "SCHOOL", "NGO", "ENTERPRISE", "CENTRAL"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return fail(405, "Method not allowed");
  }

  try {
    // service_role is required to bypass RLS and seed the org + grant.
    if (!serviceRoleKey) {
      console.error("[create_org] SUPABASE_SERVICE_ROLE_KEY missing");
      return fail(500, "Serveur non configuré (service role absent)");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Identify the caller from their JWT (Authorization header).
    const authHeader = req.headers.get("Authorization") ?? "";
    const userJwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!userJwt) {
      return fail(401, "Non authentifié");
    }
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(userJwt);
    if (userError || !user) {
      console.error("[create_org] user verification failed", userError?.message);
      return fail(401, "Session invalide ou expirée");
    }

    // 2. Central-admin gate: caller must hold an ACTIVE org_admins grant.
    const { data: grants, error: grantError } = await admin
      .from("org_admins")
      .select("id")
      .eq("admin_profile_id", user.id)
      .eq("status", "ACTIVE")
      .limit(1);
    if (grantError || !grants || grants.length === 0) {
      console.error(
        "[create_org] rejected: no active central grant",
        { by: user.id, error: grantError?.message },
      );
      return fail(403, "Admin central requis (aucun grant org_admins actif)");
    }

    // 3. Read the body.
    let body: { name?: string; type?: string; parentOrgId?: string | null } =
      {};
    try {
      body = await req.json();
    } catch {
      /* empty body */
    }
    const name = String(body?.name ?? "").trim();
    if (!name) return fail(400, "Le nom de l'organisation est requis");
    const type = VALID_TYPES.includes(String(body?.type))
      ? String(body?.type)
      : "CHURCH";
    const parentOrgId = body?.parentOrgId ? String(body.parentOrgId) : null;

    // 4. Create the org (ACTIVE) and grant the creator admin on it.
    const orgId = "org-" + crypto.randomUUID();
    const { error: orgError } = await admin.from("organizations").insert({
      id: orgId,
      name,
      type,
      status: "ACTIVE",
      parent_org_id: parentOrgId,
    });
    if (orgError) {
      console.error("[create_org] org insert failed", orgError.message);
      return fail(500, "Échec de la création de l'organisation : " + orgError.message);
    }

    const grantId = crypto.randomUUID();
    const { error: grantInsertError } = await admin.from("org_admins").insert({
      id: grantId,
      admin_profile_id: user.id,
      org_id: orgId,
      status: "ACTIVE",
      granted_by: user.id,
    });
    if (grantInsertError) {
      // Roll back the org row if the grant couldn't be written.
      await admin.from("organizations").delete().eq("id", orgId);
      console.error("[create_org] grant insert failed", grantInsertError.message);
      return fail(500, "Échec de l'attribution admin : " + grantInsertError.message);
    }

    console.log("[create_org] created", {
      orgId,
      name,
      type,
      parentOrgId,
      by: user.id,
    });
    return ok({ ok: true, orgId, name, type, status: "ACTIVE" });
  } catch (e) {
    console.error("[create_org] unexpected error", e);
    return fail(500, (e as Error)?.message ?? "Erreur interne");
  }
});
