/**
 * Account Service — PowerSync
 *
 * All account operations now use PowerSync.
 */

import { getPowerSyncDatabase } from '@/lib/powersync';
import type { Transaction } from '@/types';

/**
 * Get the derived balance for an account (caisse).
 * Invariant NeverBreak #2: balance is derived, never stored.
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const db = getPowerSyncDatabase();
  const result = await db.execute('SELECT * FROM transactions WHERE source_caisse_id = ? AND status = ?', [accountId, 'APPROVED']);
  const approved: any[] = result?.result || [];
  const income = approved.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0);
  const expense = approved.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0);
  return income - expense;
}
