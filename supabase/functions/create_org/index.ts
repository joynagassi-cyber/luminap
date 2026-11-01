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
 *   2. decide the path:
 *      (a) SELF-SERVE — the caller has NO organisation of its own yet (a fresh
 *          signup is `MEMBRE`/`__no_org__`). It may create its FIRST
 *          organisation and becomes its `ADMIN` + is attached to it. This is
 *          the onboarding wizard path.
 *      (b) ADMIN — the caller already belongs to an organisation and holds an
 *          ACTIVE `org_admins` grant (or the canonical `ADMIN` role) → creates
 *          an ANNEXE (child org).
 *   3. create the org row (status ACTIVE) and grant the creator admin on it.
 *
 * Once the creator is an admin of the new org, the normal app UI (RLS-scoped
 * to that org) lets them seed caisses/groups/categories and invite members via
 * the invitation flow.
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

    // 2. Read the caller's current organisation to decide the path.
    //
    //    Two legitimate paths create an organisation:
    //      (a) SELF-SERVE — a brand-new account with NO organisation of its
    //          own yet creates its FIRST organisation. This is the flow the
    //          onboarding wizard ("Je crée mon organisation") must persist;
    //          without it the account stays `org_id = '__no_org__'` forever
    //          and the app is unusable (needs-membership dead end).
    //      (b) ADMIN — an account that already belongs to an organisation
    //          creates an ANNEXE (child org). Only allowed if it holds an
    //          ACTIVE `org_admins` grant OR the canonical `ADMIN` role (R109).
    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (callerProfileError) {
      console.error("[create_org] profile lookup failed", callerProfileError.message);
    }
    const callerOrgId = callerProfile?.org_id ?? null;
    const hasOwnOrg =
      !!callerOrgId && callerOrgId !== "__no_org__" && callerOrgId !== "no-org";

    // (a) Self-serve bootstrap: no org of its own yet. A fresh signup is
    //     `MEMBRE`/`__no_org__`; we accept it as long as it has NO org.
    const isSelfServe = !hasOwnOrg;

    // (b) Admin path (creating an annexe) — same gate as before.
    let isAdmin = false;
    if (!isSelfServe) {
      const { data: grants, error: grantError } = await admin
        .from("org_admins")
        .select("id")
        .eq("admin_profile_id", user.id)
        .eq("status", "ACTIVE")
        .limit(1);
      if (!grantError && grants && grants.length > 0) {
        isAdmin = true;
      } else {
        // R109 : un porteur du rôle canon ADMIN administre son organisation et
        // peut créer des annexes, même sans ligne `org_admins`.
        isAdmin = callerProfile?.role === "ADMIN";
      }
      if (!isAdmin) {
        console.error(
          "[create_org] rejected: no active central grant and not ADMIN",
          { by: user.id, error: grantError?.message },
        );
        return fail(403, "Admin central requis (aucun grant org_admins actif)");
      }
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

    // 3bis. Si une organisation parente est fournie, l'appelant doit en etre
    // un administrateur ACTIF. Sans cette verification, un admin d'une
    // organisation A pourrait rattacher une annexe au tenant d'une
    // organisation B (violation d'integrite inter-tenant) : le service_role
    // contourne la RLS `orgs_insert_merged`. On rejoue donc la meme regle ici.
    if (parentOrgId) {
      const { data: parentGrant, error: parentGrantError } = await admin
        .from("org_admins")
        .select("id")
        .eq("admin_profile_id", user.id)
        .eq("org_id", parentOrgId)
        .eq("status", "ACTIVE")
        .limit(1);
      let parentOk = !parentGrantError && !!parentGrant && parentGrant.length > 0;
      if (!parentOk) {
        // R109 : un ADMIN canonique administre l'organisation où il se trouve.
        const { data: parentProf } = await admin
          .from("profiles")
          .select("org_id, role")
          .eq("id", user.id)
          .maybeSingle();
        parentOk =
          parentProf?.role === "ADMIN" && parentProf?.org_id === parentOrgId;
      }
      if (!parentOk) {
        console.error("[create_org] rejected: not admin of parent org", {
          by: user.id,
          parentOrgId,
          error: parentGrantError?.message,
        });
        return fail(403, "Administrateur de l'organisation parente requis");
      }
    }

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

    // 4bis. SELF-SERVE — the creator of a brand-new organisation becomes its
    // administrator and is attached to it. Without this the account stays
    // `MEMBRE`/`__no_org__` and every org-scoped screen is a dead end. The
    // service_role bypasses the `trg_guard_profile_org` trigger (which only
    // blocks direct client writes), so this is the sanctioned server path.
    //
    // `role = 'ADMIN'` (canonical, R109) — the org owner must be able to
    // administer it (settings, roles, invitations); the wizard's cosmetic role
    // choice is not sufficient (e.g. COMPTABLE cannot invite members).
    if (isSelfServe) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({ org_id: orgId, role: "ADMIN", status: "ACTIVE" })
        .eq("id", user.id);
      if (profileError) {
        console.error("[create_org] profile link failed", profileError.message);
        // Roll back org + grant so a half-created tenant never exists.
        await admin.from("org_admins").delete().eq("id", grantId);
        await admin.from("organizations").delete().eq("id", orgId);
        return fail(
          500,
          "Échec du rattachement du profil à l'organisation : " + profileError.message,
        );
      }

      // Mirror the invitation flow: record the membership (multi-org socle).
      const { error: membershipError } = await admin
        .from("org_memberships")
        .upsert(
          {
            user_id: user.id,
            org_id: orgId,
            role: "ADMIN",
            is_primary: true,
            status: "ACTIVE",
          },
          { onConflict: "user_id,org_id,role" },
        );
      if (membershipError) {
        // Non-fatal: `profiles.org_id` is the authoritative membership for the
        // single-org UI; log so it can be reconciled without failing the user.
        console.error(
          "[create_org] membership insert failed (non-fatal)",
          membershipError.message,
        );
      }
    }

    console.log("[create_org] created", {
      orgId,
      name,
      type,
      parentOrgId,
      selfServe: isSelfServe,
      by: user.id,
    });
    return ok({
      ok: true,
      orgId,
      name,
      type,
      status: "ACTIVE",
      grantId,
      role: isSelfServe ? "ADMIN" : (callerProfile?.role ?? null),
    });
  } catch (e) {
    console.error("[create_org] unexpected error", e);
    return fail(500, (e as Error)?.message ?? "Erreur interne");
  }
});
