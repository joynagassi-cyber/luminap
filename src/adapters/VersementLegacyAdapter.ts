import type { Versement } from "@/types";

/**
 * VersementLegacyAdapter — derives canonical Versement from paired transactions
 *
 * The versements table may be empty (legacy mode). This adapter derives
 * a Versement from two transactions sharing the same versementId.
 */
export class VersementLegacyAdapter {
  /**
   * Derive a Versement from two paired transactions.
   * Returns null if the transactions don't form a valid pair.
   */
  static fromTransactions(transactions: any[]): Versement | null {
    if (transactions.length !== 2) return null;

    const versementId = transactions[0].versement_id;
    if (!versementId) return null;

    const incomeTx = transactions.find((t: any) => t.type === "INCOME");
    const expenseTx = transactions.find((t: any) => t.type === "EXPENSE");
    if (!incomeTx || !expenseTx) return null;

    return {
      id: versementId,
      orgId: transactions[0].org_id,
      fromAccountId: expenseTx.source_caisse_id,
      toAccountId: incomeTx.source_caisse_id,
      amountCents: expenseTx.amount,
      date: transactions[0].date,
      status: "APPROVED" as const,
      createdBy: transactions[0].created_by_id,
      approvedBy: transactions[0].approved_by_id,
      approvedAt: transactions[0].approved_at,
      createdAt: transactions[0].created_at,
    } as Versement;
  }
}
