import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transactionGuard, WorkflowService, type GuardResult, type WorkflowGuard } from '../workflow';

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
  });
});
