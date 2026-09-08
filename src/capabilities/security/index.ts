/**
 * Security Capability — role-based access control (RBAC)
 *
 * Universal pattern: roles map to permissions via a permission matrix.
 * Hierarchical roles allow approval chains (higher roles can approve
 * actions from lower roles).
 *
 * Usage:
 *   import { security } from '@/capabilities/security'
 *   const allowed = security.hasRole(user.role, 'transaction', 'approve')
 *   const labels = security.getRoleLabels()
 */

import type { Role } from '@/types';

/** Permission string type — resource:action format */
export type Permission =
  | 'transaction:create'
  | 'transaction:read'
  | 'transaction:update'
  | 'transaction:approve'
  | 'transaction:reject'
  | 'transaction:delete'
  | 'versement:create'
  | 'versement:approve'
  | 'group:create'
  | 'group:read'
  | 'group:update'
  | 'group:delete'
  | 'event:create'
  | 'event:read'
  | 'event:update'
  | 'event:delete'
  | 'report:read'
  | 'report:export'
  | 'member:create'
  | 'member:read'
  | 'member:update'
  | 'member:delete'
  | 'cotisation:manage'
  | 'admin:settings'
  | 'admin:roles';

/**
 * Permission matrix — maps each role to its allowed permissions.
 *
 * Hierarchy (highest → lowest):
 *   Pasteur Principal > Ancien > Diacre > Responsable Département
 *   > Trésorier > Trésorier Adjoint > Secrétaire > Secrétaire Adjoint
 *   > Comptable > Responsable Groupe > Bénévole > Membre
 */
const PERMISSION_MATRIX: Readonly<Record<Role, Permission[]>> = {
  PASTEUR_PRINCIPAL: [
    'transaction:create', 'transaction:read', 'transaction:update',
    'transaction:approve', 'transaction:reject', 'transaction:delete',
    'versement:create', 'versement:approve',
    'group:create', 'group:read', 'group:update', 'group:delete',
    'event:create', 'event:read', 'event:update', 'event:delete',
    'report:read', 'report:export',
    'member:create', 'member:read', 'member:update',
    'cotisation:manage',
    'admin:settings', 'admin:roles',
  ] as Permission[],

  PASTEUR_ASSOCIE: [
    'transaction:read', 'transaction:approve', 'transaction:reject',
    'event:read', 'event:create', 'event:update',
    'report:read', 'report:export',
    'member:read',
    'cotisation:manage',
    'group:read',
  ] as Permission[],

  PASTEUR_JEUNESSE: [
    'transaction:read', 'transaction:approve',
    'event:read', 'event:create', 'event:update',
    'report:read',
    'member:read',
    'cotisation:manage',
    'group:read',
  ] as Permission[],

  ANCIEN: [
    'transaction:read', 'transaction:approve', 'transaction:reject',
    'transaction:create',
    'versement:approve',
    'group:read', 'group:create', 'group:update',
    'event:read', 'event:create', 'event:update',
    'report:read', 'report:export',
    'member:read', 'member:update',
    'cotisation:manage',
  ] as Permission[],

  DIACRE: [
    'transaction:read', 'transaction:approve',
    'event:read',
    'report:read',
    'member:read',
    'cotisation:manage',
    'group:read',
  ] as Permission[],

  RESPONSABLE_DEPARTEMENT: [
    'transaction:create', 'transaction:read', 'transaction:update',
    'event:read', 'event:create', 'event:update',
    'report:read',
    'member:read', 'member:update',
    'cotisation:manage',
    'group:read',
  ] as Permission[],

  SECRETAIRE: [
    'event:create', 'event:read', 'event:update', 'event:delete',
    'member:create', 'member:read', 'member:update',
    'report:read',
    'group:read',
  ] as Permission[],

  SECRETAIRE_ADJOINT: [
    'event:read', 'event:create', 'event:update',
    'member:read',
    'group:read',
  ] as Permission[],

  TREASURIER: [
    'transaction:create', 'transaction:read', 'transaction:update',
    'transaction:approve', 'transaction:delete',
    'versement:create', 'versement:approve',
    'group:create', 'group:read', 'group:update', 'group:delete',
    'event:create', 'event:read', 'event:update',
    'report:read', 'report:export',
    'member:create', 'member:read', 'member:update',
    'cotisation:manage',
  ] as Permission[],

  TREASURIER_ADJOINT: [
    'transaction:create', 'transaction:read', 'transaction:update',
    'transaction:approve',
    'event:create', 'event:read', 'event:update',
    'report:read',
    'member:read',
    'cotisation:manage',
  ] as Permission[],

  COMPTABLE: [
    'transaction:read',
    'report:read', 'report:export',
    'event:read',
  ] as Permission[],

  RESPONSABLE_GROUPE: [
    'transaction:create', 'transaction:read', 'transaction:update',
    'event:read', 'event:create',
    'member:read',
    'cotisation:manage',
    'group:read',
  ] as Permission[],

  BENEVOLE: [
    'transaction:read',
    'event:read',
    'member:read',
    'report:read',
  ] as Permission[],

  MEMBRE: [
    'transaction:read',
    'event:read',
  ] as Permission[],
};

/**
 * Role labels for UI display
 */
const ROLE_LABELS: Readonly<Record<Role, string>> = {
  PASTEUR_PRINCIPAL: 'Pasteur Principal',
  PASTEUR_ASSOCIE: 'Pasteur Associé',
  PASTEUR_JEUNESSE: 'Pasteur Jeunesse',
  ANCIEN: 'Ancien',
  DIACRE: 'Diacre',
  RESPONSABLE_DEPARTEMENT: 'Responsable Département',
  SECRETAIRE: 'Secrétaire',
  SECRETAIRE_ADJOINT: 'Secrétaire Adjoint',
  TREASURIER: 'Trésorier',
  TREASURIER_ADJOINT: 'Trésorier Adjoint',
  COMPTABLE: 'Comptable',
  RESPONSABLE_GROUPE: 'Responsable Groupe',
  BENEVOLE: 'Bénévole',
  MEMBRE: 'Membre',
};

/**
 * Role hierarchy levels (higher = more privileges)
 */
const ROLE_HIERARCHY: Readonly<Record<Role, number>> = {
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
 * Security service — RBAC evaluation with hierarchical roles.
 * Pure domain-agnostic permission checks.
 */
export class SecurityService {
  /**
   * Check if a role has a specific permission.
   */
  hasPermission(role: Role, permission: Permission): boolean {
    return PERMISSION_MATRIX[role]?.includes(permission) ?? false;
  }

  /**
   * Check if a user can perform an action on a resource.
   * Usage: security.hasRole(user.role, 'transaction', 'approve')
   */
  hasRole(role: Role, resource: string, action: string): boolean {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(role, permission);
  }

  /**
   * Check if user has the highest or equal hierarchy level.
   * Used for approval chains (e.g., only higher roles can approve).
   */
  hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean {
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
  }

  /**
   * Get all permissions for a role.
   */
  getRolePermissions(role: Role): Permission[] {
    return PERMISSION_MATRIX[role] ?? [];
  }

  /**
   * Get roles that have a specific permission.
   */
  getRolesWithPermission(permission: Permission): Role[] {
    return (Object.keys(PERMISSION_MATRIX) as Role[]).filter(
      role => PERMISSION_MATRIX[role].includes(permission)
    );
  }

  /**
   * Get the label for a role.
   */
  getRoleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  /**
   * Get all role labels.
   */
  getRoleLabels(): Record<Role, string> {
    return { ...ROLE_LABELS };
  }

  /**
   * Get all roles sorted by hierarchy (highest first).
   */
  getSortedRoles(): Role[] {
    return (Object.keys(PERMISSION_MATRIX) as Role[]).sort(
      (a, b) => (ROLE_HIERARCHY[b] ?? 0) - (ROLE_HIERARCHY[a] ?? 0)
    );
  }

  /**
   * Check if a role is a spiritual leader.
   */
  isSpiritualLeader(role: Role): boolean {
    return ['PASTEUR_PRINCIPAL', 'PASTEUR_ASSOCIE', 'PASTEUR_JEUNESSE', 'ANCIEN'].includes(role);
  }

  /**
   * Check if a role can manage finances.
   */
  canManageFinance(role: Role): boolean {
    return this.hasPermission(role, 'transaction:approve') ||
           this.hasPermission(role, 'versement:approve') ||
           this.hasPermission(role, 'cotisation:manage');
  }
}

/** Singleton instance */
export const security = new SecurityService();
