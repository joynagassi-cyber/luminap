import type { Permission } from '@/types';

/**
 * checkPermission — stub pour la phase mono-église.
 * Retouche toujours true car le RBAC canonique n'est pas encore implémenté.
 * Le stub est conforme à l'amendement mono-église.
 */
export async function checkPermission(
  userId: string,
  permission: Permission,
  context?: { groupId?: string; accountId?: string; eventId?: string; memberId?: string }
): Promise<boolean> {
  // Phase mono-église: stub toujours true
  // Phase suivante: vrai contrôle avec UserRoleAssignment + Role.permissions
  void userId;
  void context;
  return true;
}

/**
 * Permission matrix (for future phases)
 */
export const PERMISSION_MATRIX: Record<string, Permission[]> = {
  TREASURIER: [
    'transaction:create',
    'transaction:read',
    'transaction:update',
    'transaction:approve',
    'transaction:delete',
    'versement:create',
    'versement:approve',
    'group:create',
    'group:update',
    'group:delete',
    'event:create',
    'event:update',
    'event:delete',
    'report:read',
    'report:export',
    'member:create',
    'member:read',
    'member:update',
  ],
  TREASURIER_ADJOINT: [
    'transaction:create',
    'transaction:read',
    'transaction:update',
    'transaction:approve',
    'event:create',
    'event:update',
    'report:read',
  ],
  PASTEUR: [
    'transaction:read',
    'transaction:approve',
    'transaction:reject',
    'group:read',
    'event:read',
    'event:create',
    'report:read',
    'report:export',
    'member:read',
  ],
  SECRETAIRE: [
    'event:create',
    'event:update',
    'event:delete',
    'event:read',
    'member:create',
    'member:update',
    'member:read',
    'report:read',
  ],
  SECRETAIRE_ADJOINT: [
    'event:create',
    'event:update',
    'event:read',
    'member:create',
    'member:read',
  ],
  COMPTABLE: [
    'transaction:read',
    'report:read',
    'report:export',
    'event:read',
  ],
};

/**
 * Get permissions for a given role (for future RBAC implementation)
 */
export function getRolePermissions(role: string): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}
