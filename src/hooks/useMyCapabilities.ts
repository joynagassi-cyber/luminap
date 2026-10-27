/**
 * useMyCapabilities — §3.4 du contrat RBAC.
 *
 * PROJECTION EN LECTURE du modèle de capacités : « ce que je peux faire »
 * dans l'organisation active. Aucune décision n'est réimplémentée ici (D5) —
 * le hook interroge la décision unique (`federation.canAccess`) et le chemin
 * legacy (`security.hasPermission`), puis regroupe les permissions en
 * capacités lisibles.
 *
 * Union (comme `useCanAccessMulti`) : `allowed = federation OR legacy`. Le
 * chemin fédéré lit les grants + rôles de l'org ; le chemin legacy couvre le
 * `user.role` de l'UI tant que la fédération n'a pas résolu (base non
 * synchronisée). `source` expose lequel a tranché, pour le debug.
 *
 * Une capacité est « autorisée » dès qu'AU MOINS UNE de ses permissions est
 * accordée (même sémantique que `capabilitiesForRole` — cf. capabilities.ts).
 */

import { useEffect, useState } from "react";
import { federation } from "@/capabilities/federation";
import { security } from "@/capabilities/security";
import { CAPABILITIES, type Capability } from "@/lib/capabilities";
import { getOrganizationId } from "@/lib/orgContext";
import { subscribePowerSyncReady, useCurrentUser } from "@/lib/dataLayer";
import { parseRole, type Permission } from "@/lib/rbac";
import type { Role } from "@/types";

export type CapabilityAccessSource =
  | "legacy"
  | "federation"
  | "both"
  | "neither";

export interface CapabilityState {
  capability: Capability;
  allowed: boolean;
  source: CapabilityAccessSource | string;
}

interface Decision {
  allowed: boolean;
  source: CapabilityAccessSource;
}

/** Permissions distinctes portées par les capacités (ordre stable, module-level). */
const CAPABILITY_PERMISSIONS: readonly Permission[] = Array.from(
  new Set(CAPABILITIES.flatMap((cap) => cap.permissions)),
);

function splitPermission(permission: Permission): {
  resource: string;
  action: string;
} {
  const separator = permission.indexOf(":");
  return {
    resource: permission.slice(0, separator),
    action: permission.slice(separator + 1),
  };
}

export function useMyCapabilities(orgId?: string): {
  role: Role | null;
  capabilities: CapabilityState[];
  allowed: Capability[];
  loading: boolean;
} {
  const user = useCurrentUser();
  const userId = user?.id ?? "";
  const org = orgId ?? getOrganizationId();
  const role = parseRole(user?.role ?? "") ?? null;

  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loading, setLoading] = useState(true);
  // Bump à chaque fin de synchronisation PowerSync : une base encore vide
  // renvoie `false` au 1er rendu, il faut re-résoudre sans recharger la page.
  const [syncToken, setSyncToken] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribePowerSyncReady(() =>
      setSyncToken((n) => n + 1),
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!userId || !org) {
      setDecisions({});
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    Promise.all(
      CAPABILITY_PERMISSIONS.map(async (permission): Promise<[string, Decision]> => {
        const { resource, action } = splitPermission(permission);
        let federated = false;
        try {
          federated = await federation.canAccess(userId, org, resource, action);
        } catch {
          // Fédération indisponible (DB pas prête) : le legacy tranche seul.
          federated = false;
        }
        const legacy = role ? security.hasPermission(role, permission) : false;
        const source: CapabilityAccessSource =
          federated && legacy
            ? "both"
            : federated
              ? "federation"
              : legacy
                ? "legacy"
                : "neither";
        return [permission, { allowed: federated || legacy, source }];
      }),
    ).then((entries) => {
      if (cancelled) return;
      setDecisions(Object.fromEntries(entries));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, org, role, syncToken]);

  const capabilities: CapabilityState[] = CAPABILITIES.map((capability) => {
    const capDecisions = capability.permissions
      .map((permission) => decisions[permission])
      .filter((d): d is Decision => Boolean(d));
    const granted = capDecisions.find((d) => d.allowed);
    return {
      capability,
      allowed: Boolean(granted),
      source: granted?.source ?? "neither",
    };
  });

  return {
    role,
    capabilities,
    allowed: capabilities
      .filter((state) => state.allowed)
      .map((state) => state.capability),
    loading,
  };
}
