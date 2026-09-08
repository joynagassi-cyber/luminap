/**
 * Transaction Service
 *
 * Handles all transaction business logic including audit logging.
 */

import { workflow } from '@/capabilities/workflow';
import { writeAudit } from '@/lib/audit';
import { getOrganizationId } from '@/lib/orgContext';
import { generateId } from '@/lib/utils';
import { addTransactionPS, updateTransactionPS, deleteTransactionPS } from '@/lib/dataLayer';
import type { Transaction } from '@/types';

export interface TransactionState {
  transactions: Transaction[];
  user: { role: string; id: string };
}

// --- addTransaction ---

export function buildAddTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'reversalOfId'>,
  state: TransactionState
): { id: string; newTx: Transaction } {
  const id = generateId();
  const now = new Date().toISOString();
  const newTx: Transaction = { ...tx, id, createdAt: now, updatedAt: now, version: 1, reversalOfId: null };
  return { id, newTx };
}

export async function persistAddTransaction(
  newTx: Transaction
): Promise<void> {
  try {
    await addTransactionPS({
      org_id: newTx.orgId,
      type: newTx.type,
      amount: newTx.amount,
      description: newTx.description,
      date: newTx.date,
      status: newTx.status,
      category_id: newTx.categoryId,
      org_unit_id: newTx.orgUnitId,
      compensates_for: newTx.compensatesFor,
      comment: newTx.comment,
      version: 1,
      created_by_id: newTx.createdById,
      approved_by_id: newTx.approvedById,
      approved_at: newTx.approvedAt,
      event_id: newTx.eventId,
      source: newTx.source,
      person_name: newTx.personName,
      source_caisse_id: newTx.sourceCaisseId,
      versement_id: newTx.versementId,
      reversal_of_id: newTx.reversalOfId,
    });
  } catch (error) {
    console.error('[TransactionService] Failed to add transaction:', error);
  }
}

export async function auditAddTransaction(
  id: string,
  tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'reversalOfId'>,
  newTx: Transaction,
  role: string
): Promise<void> {
  await writeAudit({
    orgId: getOrganizationId(),
    transactionId: id,
    userId: tx.createdById || 'local-user',
    actorRoleAtTime: role,
    action: 'CREATE',
    entityType: 'Transaction',
    entityId: id,
    beforeState: null,
    afterState: newTx,
    comment: null,
  });
}

// --- updateTransaction ---

export function validateUpdateTransaction(
  transactions: Transaction[],
  id: string,
  data: Partial<Transaction>
): { allowed: boolean; reason?: string } {
  const oldTx = transactions.find(t => t.id === id);
  const guardResult = workflow.check('transaction', oldTx?.status as any, data.status as any);
  return guardResult;
}

export function applyUpdateTransaction(
  transactions: Transaction[],
  id: string,
  data: Partial<Transaction>
): Transaction[] {
  return transactions.map(t =>
    t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString(), version: t.version + 1 } : t
  );
}

// --- deleteTransaction ---

export function validateDeleteTransaction(
  transactions: Transaction[],
  id: string
): { allowed: boolean; reason?: string } {
  const oldTx = transactions.find(t => t.id === id);
  const guardResult = workflow.check('transaction', oldTx?.status as any, 'DELETED' as any);
  return guardResult;
}

export function applyDeleteTransaction(
  transactions: Transaction[],
  id: string
): Transaction[] {
  return transactions.filter(t => t.id !== id);
}

// --- batchDeleteTransactions ---

export function validateBatchDeleteTransactions(
  transactions: Transaction[],
  ids: string[]
): string[] {
  const blockedIds = ids.filter(id => {
    const tx = transactions.find(t => t.id === id);
    return workflow.check('transaction', tx?.status as any, 'DELETED' as any).allowed === false;
  });
  return blockedIds;
}

// --- approveTransaction ---

export function buildApproveTransaction(
  transactions: Transaction[],
  id: string,
  userId: string,
  now: string
): Transaction[] {
  return transactions.map(t =>
    t.id === id ? { ...t, status: 'APPROVED' as const, approvedById: userId, approvedAt: now, updatedAt: now, version: t.version + 1 } : t
  );
}

// --- batchApproveTransactions ---

export function buildBatchApproveTransactions(
  transactions: Transaction[],
  ids: string[],
  userId: string,
  now: string
): Transaction[] {
  return transactions.map(t =>
    ids.includes(t.id)
      ? { ...t, status: 'APPROVED' as const, approvedById: userId, approvedAt: now, updatedAt: now, version: t.version + 1 }
      : t
  );
}

// --- reverseTransaction ---

export interface ReverseTransactionResult {
  reversalTx: Transaction;
}

export function buildReverseTransaction(
  transactions: Transaction[],
  id: string,
  userId: string,
  reason: string
): ReverseTransactionResult | null {
  const tx = transactions.find(t => t.id === id);
  if (!tx || tx.status !== 'APPROVED') return null;

  const now = new Date().toISOString();
  const reversalId = generateId();
  return {
    reversalTx: {
      ...tx,
      id: reversalId,
      type: tx.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
      reversalOfId: id,
      status: 'APPROVED',
      approvedById: userId,
      approvedAt: now,
      comment: `Contre-transaction: ${reason}`,
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

export async function persistReverseTransaction(
  reversalTx: Transaction
): Promise<void> {
  try {
    await addTransactionPS({
      org_id: reversalTx.orgId,
      type: reversalTx.type,
      amount: reversalTx.amount,
      description: reversalTx.description,
      date: reversalTx.date,
      status: reversalTx.status,
      category_id: reversalTx.categoryId,
      org_unit_id: reversalTx.orgUnitId,
      compensates_for: reversalTx.compensatesFor,
      comment: reversalTx.comment,
      version: reversalTx.version,
      created_by_id: reversalTx.createdById,
      approved_by_id: reversalTx.approvedById,
      approved_at: reversalTx.approvedAt,
      event_id: reversalTx.eventId,
      source: reversalTx.source,
      person_name: reversalTx.personName,
      source_caisse_id: reversalTx.sourceCaisseId,
      versement_id: reversalTx.versementId,
      reversal_of_id: reversalTx.reversalOfId,
    });
  } catch (error) {
    console.error('[TransactionService] Failed to reverse transaction:', error);
  }
}
