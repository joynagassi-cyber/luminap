import { db } from './db';
import type { Caisse, Transaction } from '@/types';

/**
 * Get the derived balance for an account (caisse).
 * Invariant NeverBreak #2: balance is derived, never stored.
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const allTxs = await db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]);
  const approved = allTxs.filter(t => t.sourceCaisseId === accountId && t.status === 'APPROVED');
  const income = approved.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = approved.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  return income - expense;
}

/**
 * Get balance summary for all accounts
 */
export async function getAllAccountBalances(): Promise<Record<string, number>> {
  const caisses = await db.getAll<Caisse>('caisses').catch(() => [] as Caisse[]);
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
  const allTxs = await db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]);
  const pending = allTxs.filter(t => t.sourceCaisseId === accountId && t.status === 'PENDING');
  return pending.reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
}

/**
 * Get all transactions for an account
 */
export async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const allTxs = await db.getAll<Transaction>('transactions').catch(() => [] as Transaction[]);
  return allTxs.filter(t => t.sourceCaisseId === accountId);
}
