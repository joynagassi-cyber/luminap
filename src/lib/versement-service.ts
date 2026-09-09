/**
 * Versement Service
 *
 * Handles business logic for bank transfers (versements) between accounts.
 * A versement creates a paired expense/income transaction pair.
 */

import { getOrganizationId } from './orgContext';
import { generateId } from './utils';
import { executeWrite } from './dataLayer';
import type { Transaction } from '@/types';

export interface CreateVersementParams {
  sourceCaisseId: string;
  amount: number;
  comment?: string;
}

export interface VersementResult {
  versementId: string;
  sourceTx: Transaction;
  targetTx: Transaction;
}

/**
 * Create a versement (transfer between accounts).
 * Creates a paired expense from source and income to target (main).
 */
export async function createVersement(params: CreateVersementParams): Promise<VersementResult> {
  const now = new Date().toISOString();
  const versementId = generateId();
  const sessionId = localStorage.getItem('lumina-session') || 'local-user';
  const orgId = getOrganizationId();
  const date = now.split('T')[0];
  const comment = params.comment || `Versement ${Math.round(params.amount / 100)} FCFA -> Caisse principale`;

  // Create versement record in PowerSync
  try {
    await executeWrite(
      `INSERT INTO versements (id, org_id, from_account_id, to_account_id, amount_cents, date, status, created_by, approved_by, approved_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?)`,
      [versementId, orgId, params.sourceCaisseId, 'main', params.amount, date, sessionId, sessionId, now, now]
    );
  } catch (error) {
  }

  // Create paired transactions
  const sourceTx: Transaction = {
    id: generateId(),
    orgId,
    type: 'EXPENSE',
    amount: params.amount,
    description: `Versement vers caisse principale`,
    date,
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
    createdById: sessionId,
    approvedById: sessionId,
    approvedAt: now,
    categoryId: 'cat-dime',
    orgUnitId: null,
    eventId: null,
    source: 'CAISSE',
    personName: null,
    compensatesFor: null,
    comment,
    version: 1,
    sourceCaisseId: params.sourceCaisseId,
    versementId,
    reversalOfId: null,
  };

  const targetTx: Transaction = {
    id: generateId(),
    orgId,
    type: 'INCOME',
    amount: params.amount,
    description: `Versement de groupe`,
    date,
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
    createdById: sessionId,
    approvedById: sessionId,
    approvedAt: now,
    categoryId: 'cat-dime',
    orgUnitId: null,
    eventId: null,
    source: 'CAISSE',
    personName: null,
    compensatesFor: null,
    comment,
    version: 1,
    sourceCaisseId: 'main',
    versementId,
    reversalOfId: null,
  };

  try {
    await executeWrite(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, category_id, org_unit_id, event_id, source, person_name, comment, version, source_caisse_id, versement_id, reversal_of_id, created_by_id, approved_by_id, created_at, updated_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sourceTx.id, sourceTx.orgId, sourceTx.type, sourceTx.amount, sourceTx.description, sourceTx.date, sourceTx.status, sourceTx.categoryId, sourceTx.orgUnitId, sourceTx.eventId, sourceTx.source, sourceTx.personName, sourceTx.comment, sourceTx.version, sourceTx.sourceCaisseId, sourceTx.versementId, sourceTx.reversalOfId, sourceTx.createdById, sourceTx.approvedById, sourceTx.createdAt, sourceTx.updatedAt, sourceTx.approvedAt]
    );
    await executeWrite(
      'INSERT INTO transactions (id, org_id, type, amount, description, date, status, category_id, org_unit_id, event_id, source, person_name, comment, version, source_caisse_id, versement_id, reversal_of_id, created_by_id, approved_by_id, created_at, updated_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [targetTx.id, targetTx.orgId, targetTx.type, targetTx.amount, targetTx.description, targetTx.date, targetTx.status, targetTx.categoryId, targetTx.orgUnitId, targetTx.eventId, targetTx.source, targetTx.personName, targetTx.comment, targetTx.version, targetTx.sourceCaisseId, targetTx.versementId, targetTx.reversalOfId, targetTx.createdById, targetTx.approvedById, targetTx.createdAt, targetTx.updatedAt, targetTx.approvedAt]
    );
  } catch (error) {
  }

  return { versementId, sourceTx, targetTx };
}
