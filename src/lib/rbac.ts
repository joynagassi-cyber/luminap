import type { Role } from "@/types";

/**
 * Permission types — each represents a single allowed action.
 * Format: resource:action
 */
export type Permission =
  | "transaction:create"
  | "transaction:read"
  | "transaction:update"
  | "transaction:approve"
  | "transaction:reject"
  | "transaction:delete"
  | "versement:create"
  | "versement:approve"
  | "group:create"
  | "group:read"
  | "group:update"
  | "group:delete"
  | "event:create"
  | "event:read"
  | "event:update"
  | "event:delete"
  | "report:read"
  | "report:export"
  | "member:create"
  | "member:read"
  | "member:update"
  | "member:delete"
  | "cotisation:manage"
  | "admin:settings"
  | "admin:roles"
  | "invitation:create"
  | "invitation:revoke"
  | "invitation:manage";

/**
 * checkPermission — stub pour la phase mono-église.
 * Retourne toujours true car le RBAC canonique n'est pas encore implémenté.
 * Le stub est conforme à l'amendement mono-église.
 */

/**
 * Permission matrix — maps each role to its allowed permissions.
 *
 * Hierarchy (highest → lowest):
 *   Pasteur Principal > Ancien > Diacre > Responsable Département
 *   > Trésorier > Trésorier Adjoint > Secrétaire > Secrétaire Adjoint
 *   > Comptable > Responsable Groupe > Bénévole > Membre
 */
export const PERMISSION_MATRIX: Readonly<Record<Role, Permission[]>> = {
  // === SPIRITUAL LEADERSHIP ===
  PASTEUR_PRINCIPAL: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "transaction:approve",
    "transaction:reject",
    "transaction:delete",
    "versement:create",
    "versement:approve",
    "group:create",
    "group:read",
    "group:update",
    "group:delete",
    "event:create",
    "event:read",
    "event:update",
    "event:delete",
    "report:read",
    "report:export",
    "member:create",
    "member:read",
    "member:update",
    "cotisation:manage",
    "admin:settings",
    "admin:roles",
  ] as Permission[],

  PASTEUR_ASSOCIE: [
    "transaction:read",
    "transaction:approve",
    "transaction:reject",
    "event:read",
    "event:create",
    "event:update",
    "report:read",
    "report:export",
    "member:read",
    "cotisation:manage",
    "group:read",
  ] as Permission[],

  PASTEUR_JEUNESSE: [
    "transaction:read",
    "transaction:approve",
    "event:read",
    "event:create",
    "event:update",
    "report:read",
    "member:read",
    "cotisation:manage",
    "group:read",
  ] as Permission[],

  ANCIEN: [
    "transaction:read",
    "transaction:approve",
    "transaction:reject",
    "transaction:create",
    "versement:approve",
    "group:read",
    "group:create",
    "group:update",
    "event:read",
    "event:create",
    "event:update",
    "report:read",
    "report:export",
    "member:read",
    "member:update",
    "cotisation:manage",
  ] as Permission[],

  DIACRE: [
    "transaction:read",
    "transaction:approve",
    "event:read",
    "report:read",
    "member:read",
    "cotisation:manage",
    "group:read",
  ] as Permission[],

  RESPONSABLE_DEPARTEMENT: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "event:read",
    "event:create",
    "event:update",
    "report:read",
    "member:read",
    "member:update",
    "cotisation:manage",
    "group:read",
  ] as Permission[],

  // === ADMINISTRATIVE ===
  SECRETAIRE: [
    "event:create",
    "event:read",
    "event:update",
    "event:delete",
    "member:create",
    "member:read",
    "member:update",
    "report:read",
    "group:read",
  ] as Permission[],

  SECRETAIRE_ADJOINT: [
    "event:read",
    "event:create",
    "event:update",
    "member:read",
    "group:read",
  ] as Permission[],

  // === FINANCIAL ===
  TREASURIER: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "transaction:approve",
    "transaction:delete",
    "versement:create",
    "versement:approve",
    "group:create",
    "group:read",
    "group:update",
    "group:delete",
    "event:create",
    "event:read",
    "event:update",
    "report:read",
    "report:export",
    "member:create",
    "member:read",
    "member:update",
    "cotisation:manage",
  ] as Permission[],

  TREASURIER_ADJOINT: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "transaction:approve",
    "event:create",
    "event:read",
    "event:update",
    "report:read",
    "member:read",
    "cotisation:manage",
  ] as Permission[],

  COMPTABLE: [
    "transaction:read",
    "report:read",
    "report:export",
    "event:read",
  ] as Permission[],

  // === GROUP / COMMUNITY ===
  RESPONSABLE_GROUPE: [
    "transaction:create",
    "transaction:read",
    "transaction:update",
    "event:read",
    "event:create",
    "member:read",
    "cotisation:manage",
    "group:read",
  ] as Permission[],

  BENEVOLE: [
    "transaction:read",
    "event:read",
    "member:read",
    "report:read",
  ] as Permission[],

  MEMBRE: ["transaction:read", "event:read"] as Permission[],
};

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  PASTEUR_PRINCIPAL: "Pasteur Principal",
  PASTEUR_ASSOCIE: "Pasteur Associé",
  PASTEUR_JEUNESSE: "Pasteur Jeunesse",
  ANCIEN: "Ancien",
  DIACRE: "Diacre",
  RESPONSABLE_DEPARTEMENT: "Responsable Département",
  SECRETAIRE: "Secrétaire",
  SECRETAIRE_ADJOINT: "Secrétaire Adjoint",
  TREASURIER: "Trésorier",
  TREASURIER_ADJOINT: "Trésorier Adjoint",
  COMPTABLE: "Comptable",
  RESPONSABLE_GROUPE: "Responsable Groupe",
  BENEVOLE: "Bénévole",
  MEMBRE: "Membre",
};

/**
 * Role hierarchy levels (higher = more privileges)
 */
export const ROLE_HIERARCHY: Readonly<Record<Role, number>> = {
  PASTEUR_PRINCIPAL: 100,
  ANCIEN: 90,
  PASTEUR_ASSOCIE: 85,
  PASTEUR_JEUNESSE: 80,
  DIACRE: 70,
  RESPONSABLE_DEPARTEMENT: 60,
  TREASURIER: 55,
  TREASURIER_ADJOINT: 50,
  SECRETAIRE: 45,
  SECRETAIRE_ADJOINT: 40,
  COMPTABLE: 35,
  RESPONSABLE_GROUPE: 30,
  BENEVOLE: 20,
  MEMBRE: 10,
};

/**
 * Get all permissions for a given role
 */
export function getRolePermissions(role: Role): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

/**
 * Check if a role has a specific permission.
 * Returns false for unknown roles or permissions.
 */
export function checkPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * Get roles that have at least the given permission
 */
export function getRolesWithPermission(permission: Permission): Role[] {
  return (Object.keys(PERMISSION_MATRIX) as Role[]).filter((role) =>
    PERMISSION_MATRIX[role].includes(permission),
  );
}

/**
 * Check if user has the highest or equal hierarchy level
 * Used for approval chains (e.g., only higher roles can approve)
 */
export function hasHigherOrEqualRole(
  userRole: Role,
  requiredRole: Role,
): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

/**
 * Convert role string to Role type (with validation)
 */
export function parseRole(raw: string): Role | null {
  return (Object.keys(PERMISSION_MATRIX) as Role[]).includes(raw as Role)
    ? (raw as Role)
    : null;
}

/**
 * CHURCH-SPECIFIC: Not portable to School/Company/NGO Business Packs.
 * cotisation:manage permission is also church-specific — move to domain policy.
 */
export function isSpiritualLeader(role: Role): boolean {
  return [
    "PASTEUR_PRINCIPAL",
    "PASTEUR_ASSOCIE",
    "PASTEUR_JEUNESSE",
    "ANCIEN",
  ].includes(role);
}

/**
 * CHURCH-SPECIFIC: Not portable to School/Company/NGO Business Packs.
 * cotisation:manage permission is also church-specific — move to domain policy.
 */
export function canManageFinance(role: Role): boolean {
  return [
    "PASTEUR_PRINCIPAL",
    "ANCIEN",
    "TREASURIER",
    "TREASURIER_ADJOINT",
    "DIACRE",
  ].includes(role);
}
