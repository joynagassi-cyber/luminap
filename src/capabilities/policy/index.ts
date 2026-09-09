/**
 * Policy Capability — business rules enforcement
 *
 * Universal pattern: policy rules that validate state before operations.
 * Different from Workflow (which guards status transitions).
 *
 * Rules covered:
 *   - Cotisation: 30-day lock, minimum amount, immutability after lock
 *   - Transaction: positive amount, APPROVED immutability
 *   - Versement: balance sufficient, atomic operation contract
 *
 * Usage:
 *   import { policy } from '@/capabilities/policy'
 *   const ok = policy.cotisation.checkLock(culteDate, cotisationStatus)
 *   policy.transaction.validateAmount(50000)
 *   policy.versement.checkBalance(balance, amount)
 */

import { isCulteVerrouille } from '@/lib/cotisation-logic';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Policy violation result */
export interface PolicyResult {
  ok: boolean;
  rule?: string;
  message?: string;
}

/** Cotisation policy parameters */
export interface CotisationPolicyParams {
  culteDate: string;
  statut: string;
  montantPaye: number;
  montantObligatoire: number;
}

/** Transaction policy parameters */
export interface TransactionPolicyParams {
  amountCents: number;
  status: string;
}

/** Versement policy parameters */
export interface VersementPolicyParams {
  balanceCents: number;
  amountCents: number;
}

// ─── Cotisation Policy ────────────────────────────────────────────────────────

/**
 * Check whether a cotisation can still be modified.
 * Locked when culte is >30 days old AND payment has been recorded.
 */
export function cotisationCanModify(params: CotisationPolicyParams): PolicyResult {
  const { culteDate, statut, montantPaye } = params;

  // Non-paid cotisations are always editable (before the 30-day lock)
  if (montantPaye === 0 && statut === 'NON_PAYE') {
    if (isCulteVerrouille(culteDate)) {
      return { ok: false, rule: 'COTISATION_CULTE_LOCKED', message: 'Ce culte est verrouille (plus de 30 jours)' };
    }
    return { ok: true };
  }

  // Already paid — check lock
  if (isCulteVerrouille(culteDate)) {
    return { ok: false, rule: 'COTISATION_LOCKED', message: 'Cotisation verrouillee — culte depasse 30 jours' };
  }

  return { ok: true };
}

/**
 * Validate cotisation payment amount.
 * Minimum is 1 FCFA (100 cents). Must not be negative.
 */
export function cotisationValidateAmount(montantPayeCents: number): PolicyResult {
  if (montantPayeCents < 100) {
    return { ok: false, rule: 'COTISATION_MIN_AMOUNT', message: 'Le montant doit etre d\'au moins 1 FCFA' };
  }
  if (montantPayeCents > 99999999900) {
    return { ok: false, rule: 'COTISATION_MAX_AMOUNT', message: 'Montant maximum depasse' };
  }
  return { ok: true };
}

// ─── Transaction Policy ───────────────────────────────────────────────────────

/**
 * Validate transaction amount — must be positive (in cents).
 */
export function transactionValidateAmount(amountCents: number): PolicyResult {
  if (amountCents <= 0) {
    return { ok: false, rule: 'TRANSACTION_POSITIVE_AMOUNT', message: 'Le montant doit etre superieur a 0' };
  }
  if (amountCents > 99999999900) {
    return { ok: false, rule: 'TRANSACTION_MAX_AMOUNT', message: 'Montant maximum atteint' };
  }
  return { ok: true };
}

/**
 * Check whether a transaction can be edited.
 * APPROVED transactions are immutable (guarded by workflow.transactionGuard).
 */
export function transactionCanEdit(status: string): PolicyResult {
  if (status === 'APPROVED') {
    return { ok: false, rule: 'TRANSACTION_APPROVED_IMMUTABLE', message: 'Une transaction approuvee ne peut pas etre modifiee' };
  }
  return { ok: true };
}

// ─── Versement Policy ─────────────────────────────────────────────────────────

/**
 * Check whether a versement amount is within the available balance.
 * Returns PolicyResult with ok=false and a message when balance is insufficient.
 */
export function versementCheckBalance(params: VersementPolicyParams): PolicyResult {
  const { balanceCents, amountCents } = params;

  if (amountCents <= 0) {
    return { ok: false, rule: 'VERSEMENT_POSITIVE_AMOUNT', message: 'Le montant doit etre superieur a 0' };
  }

  if (amountCents > balanceCents) {
    return { ok: false, rule: 'VERSEMENT_INSUFFICIENT_BALANCE', message: 'Solde insuffisant pour ce versement' };
  }

  return { ok: true };
}

/**
 * Validate that a versement is atomic: same amount moves from source to target.
 * Returns ok=true when the two transaction amounts are equal (in cents).
 */
export function versementValidateAtomic(sourceAmountCents: number, targetAmountCents: number): PolicyResult {
  if (sourceAmountCents !== targetAmountCents) {
    return {
      ok: false,
      rule: 'VERSEMENT_ATOMIC',
      message: 'Le versement doit etre atomique — montants differents',
    };
  }
  return { ok: true };
}

// ─── PolicyService ────────────────────────────────────────────────────────────

/**
 * Policy service — facade for all business-rule checks.
 * Pure functions, no side effects.
 */
export class PolicyService {
  cotisation = {
    canModify: cotisationCanModify,
    validateAmount: cotisationValidateAmount,
  };

  transaction = {
    validateAmount: transactionValidateAmount,
    canEdit: transactionCanEdit,
  };

  versement = {
    checkBalance: versementCheckBalance,
    validateAtomic: versementValidateAtomic,
  };
}

/** Singleton instance */
export const policy = new PolicyService();
