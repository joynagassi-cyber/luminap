import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityService } from '../security';
import {
  PERMISSION_MATRIX,
  ROLE_LABELS,
  ROLE_HIERARCHY,
  hasPermission,
  hasHigherOrEqualRole,
  parseRole,
  getRolePermissions,
} from '@/lib/rbac';
import type { Role, Permission } from '@/types';

describe('security capability', () => {
  let security: SecurityService;

  beforeEach(() => {
    security = new SecurityService();
  });

  // ─── hasPermission ─────────────────────────────────────────────

  describe('hasPermission', () => {
    it('returns true for PASTEUR_PRINCIPAL with admin:settings', () => {
      expect(security.hasPermission('PASTEUR_PRINCIPAL', 'admin:settings')).toBe(true);
    });

    it('returns false for MEMBRE with admin:settings', () => {
      expect(security.hasPermission('MEMBRE', 'admin:settings')).toBe(false);
    });

    it('returns true for TREASURIER with transaction:approve', () => {
      expect(security.hasPermission('TREASURIER', 'transaction:approve')).toBe(true);
    });

    it('returns false for BENEVOLE with transaction:approve', () => {
      expect(security.hasPermission('BENEVOLE', 'transaction:approve')).toBe(false);
    });

    it('returns true for BENEVOLE with transaction:read', () => {
      expect(security.hasPermission('BENEVOLE', 'transaction:read')).toBe(true);
    });

    it('returns false for unknown permission', () => {
      expect(security.hasPermission('MEMBRE', 'unknown:perm')).toBe(false);
    });

    it('verifies PERMISSION_MATRIX is consistent with hasPermission', () => {
      for (const role of Object.keys(PERMISSION_MATRIX) as Role[]) {
        const perms = PERMISSION_MATRIX[role];
        for (const perm of perms) {
          expect(security.hasPermission(role as Role, perm as Permission)).toBe(true);
        }
      }
    });
  });

  // ─── hasRole ───────────────────────────────────────────────────

  describe('hasRole', () => {
    it('returns true when role has the resource:action permission', () => {
      expect(security.hasRole('TREASURIER', 'transaction', 'approve')).toBe(true);
    });

    it('returns false when role lacks the permission', () => {
      expect(security.hasRole('MEMBRE', 'transaction', 'approve')).toBe(false);
    });

    it('maps resource:action to Permission type internally', () => {
      // This is the internal conversion the service performs
      expect(security.hasRole('PASTEUR_PRINCIPAL', 'group', 'delete')).toBe(true);
      expect(security.hasRole('MEMBRE', 'group', 'delete')).toBe(false);
    });

    it('handles event permissions', () => {
      expect(security.hasRole('SECRETAIRE', 'event', 'create')).toBe(true);
      expect(security.hasRole('BENEVOLE', 'event', 'create')).toBe(false);
    });

    it('handles member permissions', () => {
      expect(security.hasRole('SECRETAIRE', 'member', 'create')).toBe(true);
      expect(security.hasRole('BENEVOLE', 'member', 'create')).toBe(false);
    });
  });

  // ─── hasHigherOrEqualRole ──────────────────────────────────────

  describe('hasHigherOrEqualRole', () => {
    it('returns true for equal roles', () => {
      expect(security.hasHigherOrEqualRole('TREASURIER', 'TREASURIER')).toBe(true);
    });

    it('returns true when user role is higher in hierarchy', () => {
      // PASTEUR_PRINCIPAL (100) > TREASURIER (55)
      expect(security.hasHigherOrEqualRole('PASTEUR_PRINCIPAL', 'TREASURIER')).toBe(true);
    });

    it('returns false when user role is lower in hierarchy', () => {
      // MEMBRE (10) < TREASURIER (55)
      expect(security.hasHigherOrEqualRole('MEMBRE', 'TREASURIER')).toBe(false);
    });

    it('handles ANCIEN vs PASTEUR_ASSOCIE', () => {
      // ANCIEN (90) > PASTEUR_ASSOCIE (85)
      expect(security.hasHigherOrEqualRole('ANCIEN', 'PASTEUR_ASSOCIE')).toBe(true);
      expect(security.hasHigherOrEqualRole('PASTEUR_ASSOCIE', 'ANCIEN')).toBe(false);
    });

    it('handles full hierarchy chain', () => {
      const hierarchy: Role[] = [
        'PASTEUR_PRINCIPAL', 'ANCIEN', 'PASTEUR_ASSOCIE', 'PASTEUR_JEUNESSE',
        'DIACRE', 'RESPONSABLE_DEPARTEMENT', 'TREASURIER', 'TREASURIER_ADJOINT',
        'SECRETAIRE', 'SECRETAIRE_ADJOINT', 'COMPTABLE', 'RESPONSABLE_GROUPE',
        'BENEVOLE', 'MEMBRE',
      ];
      for (let i = 0; i < hierarchy.length; i++) {
        for (let j = 0; j < hierarchy.length; j++) {
          const user = hierarchy[i];
          const required = hierarchy[j];
          const expected = i <= j; // lower index = higher rank
          expect(security.hasHigherOrEqualRole(user, required)).toBe(expected);
        }
      }
    });
  });

  // ─── getRolePermissions ─────────────────────────────────────────

  describe('getRolePermissions', () => {
    it('returns all permissions for PASTEUR_PRINCIPAL', () => {
      const perms = security.getRolePermissions('PASTEUR_PRINCIPAL');
      expect(perms).toHaveLength(PERMISSION_MATRIX.PASTEUR_PRINCIPAL.length);
      expect(perms).toEqual(PERMISSION_MATRIX.PASTEUR_PRINCIPAL);
    });

    it('returns empty array for unknown role', () => {
      const perms = security.getRolePermissions('UNKNOWN_ROLE' as Role);
      expect(perms).toEqual([]);
    });

    it('returns correct count for MEMBRE (lowest role)', () => {
      const perms = security.getRolePermissions('MEMBRE');
      expect(perms).toHaveLength(2); // transaction:read, event:read
    });
  });

  // ─── getRolesWithPermission ────────────────────────────────────

  describe('getRolesWithPermission', () => {
    it('returns roles that have transaction:approve', () => {
      const roles = security.getRolesWithPermission('transaction:approve');
      expect(roles).toContain('PASTEUR_PRINCIPAL');
      expect(roles).toContain('TREASURIER');
      expect(roles).not.toContain('MEMBRE');
    });

    it('returns roles that have admin:settings', () => {
      const roles = security.getRolesWithPermission('admin:settings');
      expect(roles).toHaveLength(1);
      expect(roles[0]).toBe('PASTEUR_PRINCIPAL');
    });

    it('returns empty array for permission no role has', () => {
      const roles = security.getRolesWithPermission('nonexistent:perm' as Permission);
      expect(roles).toHaveLength(0);
    });
  });

  // ─── getRoleLabel ──────────────────────────────────────────────

  describe('getRoleLabel', () => {
    it('returns French label for PASTEUR_PRINCIPAL', () => {
      expect(security.getRoleLabel('PASTEUR_PRINCIPAL')).toBe('Pasteur Principal');
    });

    it('returns French label for MEMBRE', () => {
      expect(security.getRoleLabel('MEMBRE')).toBe('Membre');
    });

    it('returns the role itself for unknown role', () => {
      expect(security.getRoleLabel('UNKNOWN' as Role)).toBe('UNKNOWN');
    });
  });

  // ─── getRoleLabels ─────────────────────────────────────────────

  describe('getRoleLabels', () => {
    it('returns a copy of all role labels', () => {
      const labels = security.getRoleLabels();
      expect(labels.PASTEUR_PRINCIPAL).toBe('Pasteur Principal');
      expect(labels.MEMBRE).toBe('Membre');
    });

    it('returns a shallow copy (modifying it does not affect internal state)', () => {
      const labels = security.getRoleLabels();
      (labels as any)['PASTEUR_PRINCIPAL'] = 'modified';
      expect(security.getRoleLabel('PASTEUR_PRINCIPAL')).toBe('Pasteur Principal');
    });
  });

  // ─── getSortedRoles ────────────────────────────────────────────

  describe('getSortedRoles', () => {
    it('returns roles sorted by hierarchy descending (highest first)', () => {
      const sorted = security.getSortedRoles();
      expect(sorted[0]).toBe('PASTEUR_PRINCIPAL');
      expect(sorted[sorted.length - 1]).toBe('MEMBRE');
    });

    it('returns all registered roles', () => {
      const sorted = security.getSortedRoles();
      expect(sorted).toHaveLength(Object.keys(PERMISSION_MATRIX).length);
    });

    it('is deterministic', () => {
      const s1 = security.getSortedRoles();
      const s2 = security.getSortedRoles();
      expect(s1).toEqual(s2);
    });
  });

  // ─── parseRole ─────────────────────────────────────────────────

  describe('parseRole', () => {
    it('returns the Role for a valid role string', () => {
      expect(security.parseRole('TREASURIER')).toBe('TREASURIER');
    });

    it('returns null for an invalid role string', () => {
      expect(security.parseRole('UNKNOWN_ROLE')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(security.parseRole('')).toBeNull();
    });

    it('handles all valid roles', () => {
      for (const role of Object.keys(PERMISSION_MATRIX) as Role[]) {
        expect(security.parseRole(role)).toBe(role);
      }
    });
  });

  // ─── Re-exported constants ─────────────────────────────────────

  describe('re-exported constants', () => {
    it('ROLE_LABELS contains all roles', () => {
      for (const role of Object.keys(PERMISSION_MATRIX) as Role[]) {
        expect(ROLE_LABELS[role]).toBeDefined();
      }
    });

    it('ROLE_HIERARCHY contains all roles with numeric values', () => {
      for (const role of Object.keys(PERMISSION_MATRIX) as Role[]) {
        expect(typeof ROLE_HIERARCHY[role]).toBe('number');
      }
    });

    it('PERMISSION_MATRIX is non-empty', () => {
      expect(Object.keys(PERMISSION_MATRIX).length).toBeGreaterThan(0);
    });
  });
});
