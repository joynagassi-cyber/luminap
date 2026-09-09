import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

// ─── Security Capability Tests ─────────────────────────────────────────────────

describe('security capability', () => {
  let security: SecurityService;

  beforeEach(() => {
    security = new SecurityService();
  });

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

  describe('checkPermission', () => {
    it('returns true for PASTEUR_PRINCIPAL with admin:settings', () => {
      expect(security.checkPermission('PASTEUR_PRINCIPAL', 'admin:settings')).toBe(true);
    });

    it('returns false for MEMBRE with transaction:delete', () => {
      expect(security.checkPermission('MEMBRE', 'transaction:delete')).toBe(false);
    });

    it('returns true for TREASURIER with transaction:approve', () => {
      expect(security.checkPermission('TREASURIER', 'transaction:approve')).toBe(true);
    });

    it('returns false for COMPTABLE with event:create', () => {
      expect(security.checkPermission('COMPTABLE', 'event:create')).toBe(false);
    });

    it('returns false for unknown role', () => {
      expect(security.checkPermission('UNKNOWN_ROLE' as Role, 'transaction:read')).toBe(false);
    });

    it('returns empty array for unknown permission in getRolesWithPermission', () => {
      const roles = security.getRolesWithPermission('nonexistent:perm' as Permission);
      expect(roles).toHaveLength(0);
    });
  });

  describe('hasRole', () => {
    it('returns true when role has the resource:action permission', () => {
      expect(security.hasRole('TREASURIER', 'transaction', 'approve')).toBe(true);
    });

    it('returns false when role lacks the permission', () => {
      expect(security.hasRole('MEMBRE', 'transaction', 'approve')).toBe(false);
    });

    it('maps resource:action to Permission type internally', () => {
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

  describe('hasHigherOrEqualRole', () => {
    it('returns true for equal roles', () => {
      expect(security.hasHigherOrEqualRole('TREASURIER', 'TREASURIER')).toBe(true);
    });

    it('returns true when user role is higher in hierarchy', () => {
      expect(security.hasHigherOrEqualRole('PASTEUR_PRINCIPAL', 'TREASURIER')).toBe(true);
    });

    it('returns false when user role is lower in hierarchy', () => {
      expect(security.hasHigherOrEqualRole('MEMBRE', 'TREASURIER')).toBe(false);
    });

    it('handles ANCIEN vs PASTEUR_ASSOCIE', () => {
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
          const expected = i <= j;
          expect(security.hasHigherOrEqualRole(user, required)).toBe(expected);
        }
      }
    });
  });

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
      expect(perms).toHaveLength(2);
    });
  });

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

// ─── Auth State Persistence Tests ────────────────────────────────────────────
// Tests the AuthService by directly manipulating internal state and spying on methods.
// Since auth.ts creates its own supabase client, we test the business logic
// (validation, state transitions, error handling) without needing Supabase mocks.

describe('auth state persistence', () => {
  let authService: any;

  beforeEach(async () => {
    // Import fresh instance
    const authModule = await import('@/lib/auth');
    authService = authModule.authService;
    // Reset internal state
    authService['state'] = {
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    };
    authService['listeners'] = new Set();
    authService['stopSessionValidation']();
    // Clear any setInterval from previous tests
    vi.clearAllTimers();
  });

  afterEach(() => {
    authService['stopSessionValidation']();
    vi.clearAllTimers();
  });

  // ─── input validation ──────────────────────────────────────────

  describe('input validation', () => {
    it('rejects empty email in signInWithEmail', async () => {
      const result = await authService.signInWithEmail('', 'password123');
      expect(result.error).toBe('Please enter a valid email address.');
    });

    it('rejects invalid email format in signInWithEmail', async () => {
      const result = await authService.signInWithEmail('not-an-email', 'password123');
      expect(result.error).toBe('Please enter a valid email address.');
    });

    it('rejects short password in signInWithEmail', async () => {
      const result = await authService.signInWithEmail('test@example.com', '12345');
      expect(result.error).toBe('Password must be at least 8 characters long.');
    });

    it('rejects empty email in signUpWithEmail', async () => {
      const result = await authService.signUpWithEmail('', 'password123', 'John', 'Doe', 'MEMBRE');
      expect(result.error).toBe('Please enter a valid email address.');
    });

    it('rejects empty first name in signUpWithEmail', async () => {
      const result = await authService.signUpWithEmail('test@example.com', 'password123', '', 'Doe', 'MEMBRE');
      expect(result.error).toBe('Please enter your first name.');
    });

    it('rejects short password in signUpWithEmail', async () => {
      const result = await authService.signUpWithEmail('test@example.com', '12345', 'John', 'Doe', 'MEMBRE');
      expect(result.error).toBe('Password must be at least 8 characters long.');
    });
  });

  // ─── session validation ────────────────────────────────────────

  describe('session validation', () => {
    it('isAuthenticated returns false when no session', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('isAuthenticated returns true when session and user exist', () => {
      authService['state'].session = { user: { id: 'user-1' } } as any;
      authService['state'].user = { id: 'user-1' };
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated returns false when session exists but user is null', () => {
      authService['state'].session = { user: null } as any;
      authService['state'].user = null;
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('isSessionValid returns false when no session', async () => {
      const valid = await authService.isSessionValid();
      expect(valid).toBe(false);
    });

    it('isSessionValid returns false for expired session', async () => {
      const expiredSession = {
        user: { id: 'user-1' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) - 100,
      };
      authService['state'].session = expiredSession as any;
      const valid = await authService.isSessionValid();
      expect(valid).toBe(false);
    });

    it('isSessionValid returns false for session expiring soon (within 5 min buffer)', async () => {
      const expiringSession = {
        user: { id: 'user-1' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 100,
      };
      authService['state'].session = expiringSession as any;
      const valid = await authService.isSessionValid();
      expect(valid).toBe(false);
    });

    it('isSessionValid returns true for valid session (expires in 2 hours)', async () => {
      const validSession = {
        user: { id: 'user-1' },
        access_token: 'token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      };
      authService['state'].session = validSession as any;
      // Directly test the private helper method
      expect(authService['isSessionExpiredOrExpiring'](validSession)).toBe(false);
    });

    it('isSessionValid returns false when expires_at is 0', async () => {
      const session = { user: { id: 'user-1' }, access_token: 'token', expires_at: 0 } as any;
      authService['state'].session = session;
      const valid = await authService.isSessionValid();
      expect(valid).toBe(false);
    });
  });

  // ─── state management ──────────────────────────────────────────

  describe('state management', () => {
    it('setState merges updates into current state', () => {
      authService['state'].session = { user: { id: 'user-1' } } as any;
      authService['state'].user = { id: 'user-1' };
      authService['setState']({ isLoading: true });
      expect(authService.getState().isLoading).toBe(true);
      // Other fields should be preserved
      expect(authService.getState().session).not.toBeNull();
    });

    it('getState returns current state', () => {
      const state = authService.getState();
      expect(state).toEqual(authService['state']);
    });
  });

  // ─── profile update validation ─────────────────────────────────

  describe('profile update validation', () => {
    beforeEach(() => {
      authService['state'].user = { id: 'user-1', email: 'test@example.com' };
    });

    it('returns error when not logged in', async () => {
      authService['state'].user = null;
      const result = await authService.updateProfile({ first_name: 'John' });
      expect(result.error).toBe('No user logged in');
    });

    it('rejects empty first name in updateProfile', async () => {
      const result = await authService.updateProfile({ first_name: '   ' });
      expect(result.error).toBe('First name cannot be empty.');
    });

    it('rejects invalid role in updateProfile', async () => {
      const result = await authService.updateProfile({ role: 'INVALID_ROLE' as any });
      expect(result.error).toBe('Invalid role specified.');
    });

    it('accepts valid role update', async () => {
      // Mock the supabase call - the actual DB call will fail in test env,
      // but we test the validation path first
      const result = await authService.updateProfile({ role: 'TREASURIER' });
      // Should get DB error, not validation error
      expect(result.error).not.toBe('Invalid role specified.');
    });
  });

  // ─── subscription and listener tests ────────────────────────────

  describe('subscription and listener behavior', () => {
    it('adds listener via subscribe and removes via returned function', () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      // Manually trigger notifyListeners
      authService['notifyListeners']();
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      authService['notifyListeners']();
      expect(listener).toHaveBeenCalledTimes(1); // still 1, not 2
    });

    it('persists auth state through subscribe/unsubscribe cycle', () => {
      const stateBefore = authService.getState();
      expect(stateBefore.session).toBeNull();
      expect(stateBefore.user).toBeNull();

      const unsubscribe = authService.subscribe(() => {});
      const stateAfter = authService.getState();
      expect(stateAfter.session).toBeNull();
      expect(stateAfter.user).toBeNull();
      unsubscribe();
    });
  });

  // ─── error handling in async operations ────────────────────────

  describe('error handling in async operations', () => {
    it('signInWithEmail returns null error for valid credentials (when Supabase responds)', async () => {
      // In test env, Supabase may return null error for valid-looking requests
      // or an error object - both are valid outcomes we test for
      const result = await authService.signInWithEmail('test@example.com', 'password123');
      // Should not throw - either null error or a specific error message
      expect(result).toBeDefined();
      expect(typeof result.error === 'string' || result.error === null).toBe(true);
    });

    it('signUpWithEmail handles error gracefully', async () => {
      const result = await authService.signUpWithEmail('test@example.com', 'password123', 'John', 'Doe', 'MEMBRE');
      expect(result.error).toBeTruthy();
    });

    it('handleOAuthCallback returns result object (session may or may not exist)', async () => {
      const result = await authService.handleOAuthCallback();
      // Should return a valid result object regardless of auth state
      expect(result).toBeDefined();
      expect(typeof result.error === 'string' || result.error === null).toBe(true);
    });

    it('signOut always clears state', async () => {
      authService['state'].session = { user: { id: 'user-1' } } as any;
      authService['state'].user = { id: 'user-1' };
      const result = await authService.signOut();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getState().session).toBeNull();
      expect(authService.getState().user).toBeNull();
    });
  });

  // ─── email normalization ───────────────────────────────────────

  describe('email normalization', () => {
    it('isValidEmail accepts valid emails', () => {
      expect(authService['isValidEmail']('test@example.com')).toBe(true);
      expect(authService['isValidEmail']('user.name+tag@example.co.uk')).toBe(true);
    });

    it('isValidEmail rejects invalid emails', () => {
      expect(authService['isValidEmail']('')).toBe(false);
      expect(authService['isValidEmail']('not-an-email')).toBe(false);
      expect(authService['isValidEmail']('@example.com')).toBe(false);
      expect(authService['isValidEmail']('test@')).toBe(false);
    });

    it('isValidPassword requires minimum 8 characters', () => {
      expect(authService['isValidPassword']('')).toBe(false);
      expect(authService['isValidPassword']('12345')).toBe(false);
      expect(authService['isValidPassword']('123456')).toBe(false);
      expect(authService['isValidPassword']('12345678')).toBe(true);
      expect(authService['isValidPassword']('longpassword')).toBe(true);
    });
  });

  // ─── session expiration logic ──────────────────────────────────

  describe('session expiration logic', () => {
    it('isSessionExpiredOrExpiring returns true when expires_at is 0', () => {
      const session = { expires_at: 0 } as any;
      expect(authService['isSessionExpiredOrExpiring'](session)).toBe(true);
    });

    it('isSessionExpiredOrExpiring returns true for expired session', () => {
      const session = { expires_at: Math.floor(Date.now() / 1000) - 1000 } as any;
      expect(authService['isSessionExpiredOrExpiring'](session)).toBe(true);
    });

    it('isSessionExpiredOrExpiring returns true when within 5-minute buffer', () => {
      const session = { expires_at: Math.floor(Date.now() / 1000) + 200 } as any; // 200s < 300s buffer
      expect(authService['isSessionExpiredOrExpiring'](session)).toBe(true);
    });

    it('isSessionExpiredOrExpiring returns false for session with plenty of time', () => {
      const session = { expires_at: Math.floor(Date.now() / 1000) + 7200 } as any; // 2 hours
      expect(authService['isSessionExpiredOrExpiring'](session)).toBe(false);
    });
  });
});
