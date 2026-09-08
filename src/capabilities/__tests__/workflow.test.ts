import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionGuard, eventStatusGuard, memberStatusGuard, WorkflowService, type GuardResult, type WorkflowGuard } from '../workflow';

describe('workflow capability', () => {
  let service: WorkflowService;

  beforeEach(() => {
    service = new WorkflowService();
  });

  // ─── transactionGuard ──────────────────────────────────────────

  describe('transactionGuard', () => {
    it('allows transition from DRAFT to PENDING', () => {
      const result = transactionGuard('DRAFT', 'PENDING');
      expect(result).toEqual({ allowed: true });
    });

    it('allows transition from PENDING to APPROVED', () => {
      const result = transactionGuard('PENDING', 'APPROVED');
      expect(result).toEqual({ allowed: true });
    });

    it('allows transition from PENDING to REJECTED', () => {
      const result = transactionGuard('PENDING', 'REJECTED');
      expect(result).toEqual({ allowed: true });
    });

    it('blocks transition AWAY from APPROVED (immutability)', () => {
      const result = transactionGuard('APPROVED', 'PENDING');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');
    });

    it('blocks transition from APPROVED to DRAFT', () => {
      const result = transactionGuard('APPROVED', 'DRAFT');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');
    });

    it('allows same-status transition (no-op)', () => {
      const result = transactionGuard('DRAFT', 'DRAFT');
      expect(result.allowed).toBe(true);
    });

    it('allows same-status APPROVED transition', () => {
      const result = transactionGuard('APPROVED', 'APPROVED');
      expect(result.allowed).toBe(true);
    });

    it('allows transition from REJECTED to DRAFT', () => {
      const result = transactionGuard('REJECTED', 'DRAFT');
      expect(result.allowed).toBe(true);
    });

    it('allows transition from DRAFT to APPROVED', () => {
      const result = transactionGuard('DRAFT', 'APPROVED');
      expect(result.allowed).toBe(true);
    });
  });

  // ─── WorkflowService.check ─────────────────────────────────────

  describe('WorkflowService.check', () => {
    it('returns allowed=true when no guard is registered', () => {
      const result = service.check('unknown-resource', 'DRAFT', 'PENDING');
      expect(result).toEqual({ allowed: true });
    });

    it('delegates to the registered guard', () => {
      const customGuard: WorkflowGuard = (_c, t) =>
        t === 'COMPLETE' ? { allowed: false, reason: 'BLOCKED' } : { allowed: true };
      service.register('my-resource', customGuard);

      const blocked = service.check('my-resource', 'ACTIVE', 'COMPLETE');
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe('BLOCKED');

      const allowed = service.check('my-resource', 'ACTIVE', 'PAUSED');
      expect(allowed.allowed).toBe(true);
    });

    it('uses the transaction guard registered at module load', async () => {
      // The singleton 'workflow' registers transactionGuard at load time.
      // Here we verify the same mechanism works on a fresh instance.
      const svc = new WorkflowService();
      svc.register('transaction', transactionGuard);

      const result = svc.check('transaction', 'APPROVED', 'DRAFT');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');
    });
  });

  // ─── eventStatusGuard ──────────────────────────────────────────

  describe('eventStatusGuard', () => {
    it('allows PLANIFIED → ONGOING', () => {
      const result = eventStatusGuard('PLANIFIED', 'ONGOING');
      expect(result).toEqual({ allowed: true });
    });

    it('allows PLANIFIED → CANCELLED', () => {
      const result = eventStatusGuard('PLANIFIED', 'CANCELLED');
      expect(result).toEqual({ allowed: true });
    });

    it('blocks PLANIFIED → COMPLETED (must go through ONGOING)', () => {
      const result = eventStatusGuard('PLANIFIED', 'COMPLETED');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_EVENT_TRANSITION');
    });

    it('allows ONGOING → COMPLETED', () => {
      const result = eventStatusGuard('ONGOING', 'COMPLETED');
      expect(result).toEqual({ allowed: true });
    });

    it('allows ONGOING → CANCELLED', () => {
      const result = eventStatusGuard('ONGOING', 'CANCELLED');
      expect(result).toEqual({ allowed: true });
    });

    it('blocks ONGOING → PLANIFIED (no backward transition)', () => {
      const result = eventStatusGuard('ONGOING', 'PLANIFIED');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_EVENT_TRANSITION');
    });

    it('blocks transition away from COMPLETED (terminal state)', () => {
      const result = eventStatusGuard('COMPLETED', 'ONGOING');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('EVENT_COMPLETED_IMMUTABLE');
    });

    it('blocks transition away from CANCELLED (terminal state)', () => {
      const result = eventStatusGuard('CANCELLED', 'PLANIFIED');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('EVENT_CANCELLED_IMMUTABLE');
    });

    it('allows same-status transition (no-op) for COMPLETED', () => {
      const result = eventStatusGuard('COMPLETED', 'COMPLETED');
      expect(result.allowed).toBe(true);
    });

    it('allows same-status transition (no-op) for CANCELLED', () => {
      const result = eventStatusGuard('CANCELLED', 'CANCELLED');
      expect(result.allowed).toBe(true);
    });
  });

  // ─── memberStatusGuard ──────────────────────────────────────────

  describe('memberStatusGuard', () => {
    it('allows ACTIVE → INACTIVE', () => {
      const result = memberStatusGuard('ACTIVE', 'INACTIVE');
      expect(result).toEqual({ allowed: true });
    });

    it('allows INACTIVE → ACTIVE', () => {
      const result = memberStatusGuard('INACTIVE', 'ACTIVE');
      expect(result).toEqual({ allowed: true });
    });

    it('allows same-status transition (no-op) for ACTIVE', () => {
      const result = memberStatusGuard('ACTIVE', 'ACTIVE');
      expect(result).toEqual({ allowed: true });
    });

    it('allows same-status transition (no-op) for INACTIVE', () => {
      const result = memberStatusGuard('INACTIVE', 'INACTIVE');
      expect(result).toEqual({ allowed: true });
    });

    it('blocks invalid current status', () => {
      const result = memberStatusGuard('UNKNOWN', 'ACTIVE');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_MEMBER_STATUS');
    });

    it('blocks invalid target status', () => {
      const result = memberStatusGuard('ACTIVE', 'ARCHIVED');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_MEMBER_STATUS');
    });

    it('blocks both invalid statuses', () => {
      const result = memberStatusGuard('GHOST', 'PHANTOM');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INVALID_MEMBER_STATUS');
    });
  });

  // ─── WorkflowService.transition ────────────────────────────────

  describe('WorkflowService.transition', () => {
    const makeTx = (status: string) => ({ id: 'tx-1', status });

    it('returns success=true when transition is allowed', async () => {
      service.register('transaction', transactionGuard);
      const result = await service.transition('transaction', makeTx('DRAFT'), 'PENDING');
      expect(result.success).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('returns success=false when transition is blocked by guard', async () => {
      service.register('transaction', transactionGuard);
      const result = await service.transition('transaction', makeTx('APPROVED'), 'DRAFT');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('TRANSACTION_APPROVED_IMMUTABLE');
    });

    it('returns success=true for same-status transition (no-op)', async () => {
      service.register('transaction', transactionGuard);
      const result = await service.transition('transaction', makeTx('DRAFT'), 'DRAFT');
      expect(result.success).toBe(true);
    });

    it('allows transition when no guard is registered', async () => {
      const result = await service.transition('unknown', makeTx('DRAFT'), 'ANY');
      expect(result.success).toBe(true);
    });

    it('blocks invalid member status transition', async () => {
      const makeMember = (status: string) => ({ id: 'm-1', status });
      service.register('member', memberStatusGuard);
      const result = await service.transition('member', makeMember('ACTIVE'), 'ARCHIVED');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('INVALID_MEMBER_STATUS');
    });

    it('allows valid member status transition', async () => {
      const makeMember = (status: string) => ({ id: 'm-1', status });
      service.register('member', memberStatusGuard);
      const result = await service.transition('member', makeMember('ACTIVE'), 'INACTIVE');
      expect(result.success).toBe(true);
    });
  });
});
