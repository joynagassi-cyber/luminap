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
}

export async function bootstrapOrganization(
  input: BootstrapOrgInput,
): Promise<BootstrapOrgResult> {
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
    const message =
      "message" in res.error
        ? String((res.error as { message: unknown }).message)
        : "Échec de la création de l'organisation.";
    throw new Error(message);
  }

  return res.data as BootstrapOrgResult;
}
