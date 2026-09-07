/**
 * Data Layer - Hybrid IndexedDB/PowerSync
 *
 * This layer provides a unified API that works with both IndexedDB (fallback)
 * and PowerSync (primary). Pages can gradually migrate from IndexedDB to PowerSync.
 *
 * Usage:
 * - For new features: Use PowerSync directly
 * - For existing features: Keep using useLocalStore until ready to migrate
 * - Migration path: Replace useLocalStore imports with PowerSync hooks
 */

import { useQuery, usePowerSync } from '@powersync/react';
import type { PowerSyncDatabase } from '@powersync/web';

// ============================================================
// Type definitions matching the PowerSync schema
// ============================================================

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
  joined_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  org_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  category_id: string;
  org_unit_id: string | null;
  compensates_for: string | null;
  comment: string | null;
  version: number;
  created_by_id: string;
  approved_by_id: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  event_id: string | null;
  source: string | null;
  person_name: string | null;
  source_caisse_id: string | null;
  versement_id: string | null;
  reversal_of_id: string | null;
}

export interface Event {
  id: string;
  org_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  budget: number;
  created_at: string;
  updated_at: string;
  budget_items: string | null;
}

export interface Notification {
  id: string;
  org_id: string;
  action_type: string;
  title: string;
  message: string;
  is_read: number;
  source_transaction_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  key: string;
  label_fr: string;
  type: string;
  org_id: string;
  created_at: string;
}

export interface Caisse {
  id: string;
  name: string;
  description: string;
  type: string;
  color: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  org_id: string;
  name: string;
  parent_group_id: string | null;
  responsable_member_id: string | null;
  status: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  type: string;
  org_id: string;
  created_at: string;
  description: string;
  is_active: number;
}

// ============================================================
// Query hooks for reading data
// ============================================================

/**
 * Hook to get all transactions
 */
export function useTransactions(filters?: {
  orgId?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sourceCaisseId?: string;
}) {
  const sync = usePowerSync();

  let query = 'SELECT * FROM transactions';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }
    if (filters.sourceCaisseId) {
      conditions.push('source_caisse_id = ?');
      params.push(filters.sourceCaisseId);
    }
    if (filters.dateFrom) {
      conditions.push('date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('date <= ?');
      params.push(filters.dateTo);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY created_at DESC';

  return useQuery<Transaction>(query, params, {
    reportFetching: true,
  });
}

/**
 * Hook to get all events
 */
export function useEvents(filters?: {
  orgId?: string;
  status?: string;
}) {
  const sync = usePowerSync();

  let query = 'SELECT * FROM events';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY start_date ASC';

  return useQuery<Event>(query, params);
}

/**
 * Hook to get all members
 */
export function useMembers(filters?: {
  orgId?: string;
  status?: string;
  search?: string;
}) {
  let query = 'SELECT * FROM members';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY last_name, first_name';

  return useQuery<Member>(query, params);
}

/**
 * Hook to get all groups
 */
export function useGroups(filters?: {
  orgId?: string;
  status?: string;
}) {
  let query = 'SELECT * FROM groups';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY name';

  return useQuery<Group>(query, params);
}

/**
 * Hook to get all caisses
 */
export function useCaisses(filters?: {
  orgId?: string;
  type?: string;
}) {
  let query = 'SELECT * FROM caisses';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY name';

  return useQuery<Caisse>(query, params);
}

/**
 * Hook to get all categories
 */
export function useCategories(filters?: {
  orgId?: string;
  type?: string;
}) {
  let query = 'SELECT * FROM categories';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY label_fr';

  return useQuery<Category>(query, params);
}

/**
 * Hook to get all notifications
 */
export function useNotifications(filters?: {
  orgId?: string;
  isRead?: boolean;
}) {
  let query = 'SELECT * FROM notifications';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.isRead !== undefined) {
      conditions.push('is_read = ?');
      params.push(filters.isRead ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY created_at DESC';

  return useQuery<Notification>(query, params);
}

/**
 * Hook to get org units
 */
export function useOrgUnits(filters?: {
  orgId?: string;
  isActive?: boolean;
}) {
  let query = 'SELECT * FROM org_units';
  const params: any[] = [];

  if (filters) {
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push('org_id = ?');
      params.push(filters.orgId);
    }
    if (filters.isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
  }

  query += ' ORDER BY name';

  return useQuery<OrgUnit>(query, params);
}

// ============================================================
// Write operations (using PowerSync database)
// ============================================================

/**
 * Execute a write operation using PowerSync
 */
export async function executeWrite(
  sync: PowerSyncDatabase | null,
  sql: string,
  params: any[] = []
): Promise<void> {
  if (!sync) {
    throw new Error('PowerSync database not initialized');
  }

  await sync.execute(sql, params);
}

/**
 * Add a transaction
 */
export async function addTransaction(
  sync: PowerSyncDatabase | null,
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<string> {
  if (!sync) {
    throw new Error('PowerSync database not initialized');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await sync.execute(
    `INSERT INTO transactions (
      id, org_id, type, amount, description, date, status,
      category_id, org_unit_id, compensates_for, comment,
      version, created_by_id, approved_by_id, created_at,
      updated_at, approved_at, event_id, source, person_name,
      source_caisse_id, versement_id, reversal_of_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      transaction.org_id,
      transaction.type,
      transaction.amount,
      transaction.description,
      transaction.date,
      transaction.status,
      transaction.category_id,
      transaction.org_unit_id,
      transaction.compensates_for,
      transaction.comment,
      transaction.version || 1,
      transaction.created_by_id,
      transaction.approved_by_id,
      now,
      now,
      transaction.approved_at,
      transaction.event_id,
      transaction.source,
      transaction.person_name,
      transaction.source_caisse_id,
      transaction.versement_id,
      transaction.reversal_of_id,
    ]
  );

  return id;
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  sync: PowerSyncDatabase | null,
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  if (!sync) {
    throw new Error('PowerSync database not initialized');
  }

  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.type !== undefined) {
    setClauses.push('type = ?');
    params.push(updates.type);
  }
  if (updates.amount !== undefined) {
    setClauses.push('amount = ?');
    params.push(updates.amount);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    params.push(updates.description);
  }
  if (updates.date !== undefined) {
    setClauses.push('date = ?');
    params.push(updates.date);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(updates.status);
  }
  if (updates.category_id !== undefined) {
    setClauses.push('category_id = ?');
    params.push(updates.category_id);
  }
  if (updates.org_unit_id !== undefined) {
    setClauses.push('org_unit_id = ?');
    params.push(updates.org_unit_id);
  }
  if (updates.event_id !== undefined) {
    setClauses.push('event_id = ?');
    params.push(updates.event_id);
  }
  if (updates.comment !== undefined) {
    setClauses.push('comment = ?');
    params.push(updates.comment);
  }
  if (updates.version !== undefined) {
    setClauses.push('version = ?');
    params.push(updates.version);
  }
  if (updates.approved_by_id !== undefined) {
    setClauses.push('approved_by_id = ?');
    params.push(updates.approved_by_id);
  }
  if (updates.approved_at !== undefined) {
    setClauses.push('approved_at = ?');
    params.push(updates.approved_at);
  }

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  await sync.execute(
    `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  sync: PowerSyncDatabase | null,
  id: string
): Promise<void> {
  if (!sync) {
    throw new Error('PowerSync database not initialized');
  }

  await sync.execute('DELETE FROM transactions WHERE id = ?', [id]);
}

/**
 * Add a member
 */
export async function addMember(
  sync: PowerSyncDatabase | null,
  member: Omit<Member, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  if (!sync) {
    throw new Error('PowerSync database not initialized');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await sync.execute(
    `INSERT INTO members (
      id, org_id, first_name, last_name, phone, email,
      status, joined_at, archived_at, archived_by, archive_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      member.org_id,
      member.first_name,
      member.last_name,
      member.phone,
      member.email,
      member.status,
      member.joined_at,
      member.archived_at,
      member.archived_by,
      member.archive_reason,
      now,
      now,
    ]
  );

  return id;
}
