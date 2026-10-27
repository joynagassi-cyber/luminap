/**
 * Modèle de CAPACITÉS — vocabulaire lisible pour un administrateur non technique.
 *
 * D2 du contrat RBAC (docs/agent/CONTRAT_RBAC.md) : l'UI n'expose PAS les 28
 * permissions brutes (`resource:action`) comme un mur de cases. Elle expose des
 * capacités nommées (« Gérer les finances », « Émettre des invitations », …),
 * chacune mappée à une ou plusieurs permissions réellement vérifiées par la
 * décision unique (`has_permission` / `evaluatePermission`).
 *
 * Aucune permission n'est inventée ici : la source de vérité reste
 * `PERMISSION_MATRIX` (`src/lib/rbac.ts`). Le test de couverture
 * (`__tests__/capabilities.test.ts`) verrouille l'invariant « toute permission
 * du modèle canon appartient à au moins une capacité ».
 *
 * Sémantique de « détenir une capacité » :
 *   - `capabilitiesForRole(role)` retient la capacité dès que le rôle détient
 *     AU MOINS UNE de ses permissions. C'est le choix retenu pour l'affichage :
 *     un rôle partiel (ex. TREASURIER sans `transaction:reject`) doit voir la
 *     capacité « Gérer les finances », quitte à ne pas en avoir toutes les
 *     actions. Le détail « toutes les permissions » reste accessible via
 *     `capabilityFullyGranted`.
 *   - `capabilityFullyGranted(cap, role)` exige TOUTES les permissions.
 */

import { PERMISSION_MATRIX, type Permission } from "@/lib/rbac";
import type { Role } from "@/types";

export type CapabilityDomain =
  | "finance"
  | "members"
  | "events"
  | "groups"
  | "reports"
  | "invitations"
  | "admin";

export interface Capability {
  /** Identifiant stable, ex. "finance.manage". */
  id: string;
  /** Libellé court pour l'admin, ex. "Gérer les finances". */
  label: string;
  /** Phrase courte expliquant ce que la capacité autorise. */
  description: string;
  domain: CapabilityDomain;
  /** Permissions réellement vérifiées (sous-ensemble de PERMISSION_MATRIX). */
  permissions: Permission[];
}

/**
 * Capacités exposées à l'administration. L'ordre est FIGÉ (il détermine
 * l'ordre d'affichage et la stabilité de l'ordre des hooks dans
 * `useMyCapabilities`).
 */
export const CAPABILITIES: readonly Capability[] = [
  {
    id: "finance.manage",
    label: "Gérer les finances",
    description:
      "Créer, modifier, approuver, rejeter et supprimer les transactions, et émettre des versements.",
    domain: "finance",
    permissions: [
      "transaction:create",
      "transaction:update",
      "transaction:approve",
      "transaction:reject",
      "transaction:delete",
      "versement:create",
      "versement:approve",
    ],
  },
  {
    id: "finance.view",
    label: "Consulter les finances",
    description: "Lire les transactions et les rapports financiers.",
    domain: "finance",
    permissions: ["transaction:read", "report:read"],
  },
  {
    id: "finance.export",
    label: "Exporter les rapports financiers",
    description: "Générer et exporter des rapports financiers.",
    domain: "finance",
    permissions: ["report:export"],
  },
  {
    id: "members.manage",
    label: "Gérer les membres",
    description: "Créer, modifier et supprimer les fiches de membres.",
    domain: "members",
    permissions: ["member:create", "member:update", "member:delete"],
  },
  {
    id: "members.view",
    label: "Consulter les membres",
    description: "Lire l'annuaire des membres.",
    domain: "members",
    permissions: ["member:read"],
  },
  {
    id: "events.manage",
    label: "Gérer les événements",
    description: "Créer, modifier et supprimer les événements.",
    domain: "events",
    permissions: ["event:create", "event:update", "event:delete"],
  },
  {
    id: "events.view",
    label: "Consulter les événements",
    description: "Lire le calendrier des événements.",
    domain: "events",
    permissions: ["event:read"],
  },
  {
    id: "groups.manage",
    label: "Gérer les groupes",
    description: "Créer, modifier et supprimer les groupes.",
    domain: "groups",
    permissions: ["group:create", "group:update", "group:delete"],
  },
  {
    id: "groups.view",
    label: "Consulter les groupes",
    description: "Lire la liste des groupes.",
    domain: "groups",
    permissions: ["group:read"],
  },
  {
    id: "reports.manage",
    label: "Gérer les rapports",
    description: "Consulter et exporter les rapports.",
    domain: "reports",
    permissions: ["report:read", "report:export"],
  },
  {
    id: "cotisations.manage",
    label: "Gérer les cotisations",
    description: "Suivre et mettre à jour les cotisations des membres.",
    domain: "finance",
    permissions: ["cotisation:manage"],
  },
  {
    id: "invitations.manage",
    label: "Émettre des invitations",
    description: "Créer, gérer et révoquer les invitations.",
    domain: "invitations",
    permissions: ["invitation:create", "invitation:manage", "invitation:revoke"],
  },
  {
    id: "admin.settings",
    label: "Régler les paramètres",
    description: "Accéder aux réglages d'administration de l'organisation.",
    domain: "admin",
    permissions: ["admin:settings"],
  },
  {
    id: "admin.roles",
    label: "Attribuer les rôles et capacités",
    description: "Assigner des rôles et accorder ou retirer des capacités.",
    domain: "admin",
    permissions: ["admin:roles"],
  },
];

const CAPABILITIES_BY_ID = new Map<string, Capability>(
  CAPABILITIES.map((c) => [c.id, c]),
);

/** Capacité par identifiant, ou `undefined` si inconnue. */
export function capabilityById(id: string): Capability | undefined {
  return CAPABILITIES_BY_ID.get(id);
}

/** Permissions d'une capacité (vide si l'identifiant est inconnu). */
export function permissionsOfCapability(id: string): Permission[] {
  return capabilityById(id)?.permissions ?? [];
}

/**
 * Capacités détenues par un rôle — « au moins une » des permissions (cf. en-tête).
 * L'ordre suit celui de `CAPABILITIES`.
 */
export function capabilitiesForRole(role: Role): Capability[] {
  const granted = PERMISSION_MATRIX[role] ?? [];
  return CAPABILITIES.filter((cap) =>
    cap.permissions.some((permission) => granted.includes(permission)),
  );
}

/** Vrai si le rôle détient TOUTES les permissions de la capacité. */
export function capabilityFullyGranted(cap: Capability, role: Role): boolean {
  const granted = PERMISSION_MATRIX[role] ?? [];
  return cap.permissions.every((permission) => granted.includes(permission));
}

/**
 * Décompose une capacité en paires `{ resource, action }` prêtes pour
 * `grants_payload` / `createGrantPS`. Les doublons sont retirés (une même paire
 * ne doit produire qu'un seul grant).
 */
export function capabilityGrantPayload(
  cap: Capability,
): { resource: string; action: string }[] {
  const seen = new Set<string>();
  const pairs: { resource: string; action: string }[] = [];
  for (const permission of cap.permissions) {
    const separator = permission.indexOf(":");
    const resource = permission.slice(0, separator);
    const action = permission.slice(separator + 1);
    const key = `${resource}:${action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ resource, action });
  }
  return pairs;
}
