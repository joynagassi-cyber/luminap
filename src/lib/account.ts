/**
 * Account Service - PowerSync
 *
 * All account operations now use PowerSync.
 */

import { getPowerSyncDatabase } from '@/lib/powersync';
import type { Caisse, Transaction } from '@/types';

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

/**
 * Get balance summary for all accounts
 */
export async function getAllAccountBalances(): Promise<Record<string, number>> {
  const db = getPowerSyncDatabase();
  const result = await db.execute('SELECT * FROM caisses');
  const caisses: any[] = result?.result || [];
  const balances: Record<string, number> = {};
  for (const caisse of caisses) {
    balances[caisse.id] = await getAccountBalance(caisse.id);
  }
  return balances;
}

/**
 * Get pending amount for an account
 */
export async function getAccountPendingAmount(accountId: string): Promise<number> {
  const db = getPowerSyncDatabase();
  const result = await db.execute('SELECT * FROM transactions WHERE source_caisse_id = ? AND status = ?', [accountId, 'PENDING']);
  const pending: any[] = result?.result || [];
  return pending.reduce((s: number, t: any) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
}

/**
 * Get all transactions for an account
 */
export async function getAccountTransactions(accountId: string): Promise<any[]> {
  const db = getPowerSyncDatabase();
  const result = await db.execute('SELECT * FROM transactions WHERE source_caisse_id = ?', [accountId]);
  return result?.result || [];
}
