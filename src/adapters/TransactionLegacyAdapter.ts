import type { Transaction } from '@/types';

/**
 * TransactionLegacyAdapter — handles PS→TS field mapping
 *
 * PowerSync returns snake_case columns; the TS type uses camelCase.
 * This adapter ensures the mapping is explicit and testable.
 */
export class TransactionLegacyAdapter {
  /** Map a PowerSync row to the canonical Transaction type */
  static fromPowerSync(psTx: any): Transaction {
    return {
      id: psTx.id,
      orgId: psTx.org_id,
      type: psTx.type,
      amount: psTx.amount,
      description: psTx.description,
      date: psTx.date,
      status: psTx.status,
      createdAt: psTx.created_at,
      updatedAt: psTx.updated_at,
      createdById: psTx.created_by_id,
      approvedById: psTx.approved_by_id ?? null,
      approvedAt: psTx.approved_at ?? null,
      categoryId: psTx.category_id,
      orgUnitId: psTx.org_unit_id ?? null,
      eventId: psTx.event_id ?? null,
      source: psTx.source ?? null,
      personName: psTx.person_name ?? null,
      compensatesFor: psTx.compensates_for ?? null,
      comment: psTx.comment ?? null,
      version: psTx.version,
      sourceCaisseId: psTx.source_caisse_id ?? null,
      versementId: psTx.versement_id ?? null,
      reversalOfId: psTx.reversal_of_id ?? null,
      cotisationId: psTx.cotisation_id ?? null,
    } as Transaction;
  }

  /** Check if a transaction uses legacy field naming */
  static isLegacy(tx: Transaction): boolean {
    return !!tx.sourceCaisseId && !tx.versementId;
  }
}
