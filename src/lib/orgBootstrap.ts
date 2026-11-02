/**
 * Client wrapper for the `create_org` edge function (service_role).
 *
 * A normal client cannot create the first organization (RLS gates
 * `organizations` INSERT + `org_admins` INSERT on an ACTIVE central-admin
 * grant). This helper lets a central admin bootstrap a *usable* org — the
 * server verifies the session, checks the central grant, and creates the org
 * + admin grant atomically-ish. The caller must be authenticated.
 */

import { supabase } from "@/integrations/supabase/client";

export interface BootstrapOrgInput {
  name: string;
  type?: string;
  parentOrgId?: string | null;
}

export interface BootstrapOrgResult {
  orgId: string;
  name: string;
  type: string;
  status: string;
  /** Canonical role granted to the creator (e.g. `ADMIN` for a self-serve org). */
  role?: string | null;
  /** Id of the `org_admins` grant created for the caller (client mirror). */
  grantId?: string | null;
}

/**
 * Extrait un message d'erreur lisible depuis la réponse `functions.invoke`.
 *
 * `supabase.functions.invoke` renvoie un `FunctionsHttpError` sur une réponse
 * non-2xx ; le corps JSON de la fonction (`{ error: "…" }`) est alors accessible
 * via `error.context.json()` — sans quoi l'utilisateur ne verrait qu'un message
 * générique « Edge Function returned a non-2xx status code » au lieu de la
 * cause réelle (« Échec de la création… », « Admin central requis », …).
 */
async function readErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Échec de la création de l'organisation.";
  const ctx = (error as { context?: Response } | undefined)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* corps non-JSON — garder le message générique */
    }
  }
  return fallback;
}

export async function bootstrapOrganization(
  input: BootstrapOrgInput,
): Promise<BootstrapOrgResult> {
  // Mode local-only : pas de Supabase configuré (ni `functions`) — créer
  // l'organisation entièrement sur l'appareil, sans appel réseau.
  if (!supabase.functions) {
    const orgId =
      "org_local_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    const grantId =
      "grant_local_" + Math.random().toString(36).slice(2, 11);
    try {
      const orgs = JSON.parse(
        localStorage.getItem("lumina-local-orgs") ?? "[]",
      );
      orgs.push({
        id: orgId,
        name: input.name,
        type: input.type ?? "CHURCH",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("lumina-local-orgs", JSON.stringify(orgs));
    } catch {
      /* stockage indisponible — l'orgId est quand même retourné */
    }
    return {
      orgId,
      name: input.name,
      type: input.type ?? "CHURCH",
      status: "active",
      role: "ADMIN",
      grantId,
    };
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (!accessToken) {
    throw new Error("Non authentifié — connectez-vous d'abord.");
  }

  const res = await supabase.functions.invoke("create_org", {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      name: input.name,
      type: input.type,
      parentOrgId: input.parentOrgId ?? null,
    },
  });

  if (res.error) {
    throw new Error(await readErrorMessage(res.error));
  }
  if (!res.data || (res.data as { error?: string }).error) {
    throw new Error(
      (res.data as { error?: string })?.error ??
        "Réponse invalide du serveur de création d'organisation.",
    );
  }

  return res.data as BootstrapOrgResult;
}
