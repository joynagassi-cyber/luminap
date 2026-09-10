/**
 * Security Capability — RBAC evaluation facade
 *
 * RULE: Single source of truth is src/lib/rbac.ts.
 * This module re-exports constants and wraps functions for capability-style access.
 * Do NOT redefine PERMISSION_MATRIX, ROLE_LABELS, or ROLE_HIERARCHY here.
 * Do NOT add domain-specific permissions — they belong in a Business Pack.
 */

import {
  getRolePermissions,
  hasPermission,
  hasHigherOrEqualRole,
  parseRole,
  ROLE_LABELS,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  checkPermission,
  getRolesWithPermission,
} from "@/lib/rbac";
import type { Role, Permission } from "@/types";

/** Re-export for convenience — same source of truth as rbac.ts */
export { PERMISSION_MATRIX, ROLE_LABELS, ROLE_HIERARCHY };
export type { Permission };

/**
 * Security service — facade around rbac.ts.
 * Provides the capability contract while delegating to the source of truth.
 */
export class SecurityService {
  hasPermission(role: Role, permission: Permission): boolean {
    return hasPermission(role, permission as any);
  }

  checkPermission(role: Role, permission: Permission): boolean {
    return checkPermission(role, permission as any);
  }

  hasRole(role: Role, resource: string, action: string): boolean {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(role, permission);
  }

  hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean {
    return hasHigherOrEqualRole(userRole, requiredRole);
  }

  getRolePermissions(role: Role): Permission[] {
    return getRolePermissions(role);
  }

  getRolesWithPermission(permission: Permission): Role[] {
    return (Object.keys(PERMISSION_MATRIX) as Role[]).filter((role) =>
      PERMISSION_MATRIX[role].includes(permission as any),
    );
  }

  getRoleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  getRoleLabels(): Record<Role, string> {
    return { ...ROLE_LABELS };
  }

  getSortedRoles(): Role[] {
    return (Object.keys(PERMISSION_MATRIX) as Role[]).sort(
      (a, b) => (ROLE_HIERARCHY[b] ?? 0) - (ROLE_HIERARCHY[a] ?? 0),
    );
  }

  /**
   * Parse a raw role string into a Role type.
   */
  parseRole(raw: string): Role | null {
    return parseRole(raw);
  }
}

/** Singleton instance */
export const security = new SecurityService();
