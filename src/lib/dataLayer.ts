/**
 * Unified Data Layer - PowerSync primary, PowerSync fallback
 *
 * This layer provides React hooks that try PowerSync first,
 * and fall back to local cache if PowerSync is not available yet.
 *
 * Usage:
 * import { useData } from '@/lib/dataLayer';
 * const { transactions, events, members } = useData();
 */

import { useQuery, usePowerSync } from '@powersync/react';
import type { PowerSyncDatabase } from '@powersync/web';
import { useLocalStore } from '@/store/useLocalStore';
import { useEffect, useState, useRef } from 'react';

// ============================================================
// PowerSync entity types (snake_case columns)
// ============================================================

export interface PSUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export interface PSMember {
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

export interface PSTransaction {
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

export interface PSEvent {
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

export interface PSNotification {
  id: string;
  org_id: string;
  action_type: string;
  title: string;
  message: string;
  is_read: number;
  source_transaction_id: string | null;
  created_at: string;
}

export interface PSCategory {
  id: string;
  key: string;
  label_fr: string;
  type: string;
  org_id: string;
  created_at: string;
}

export interface PSCaisse {
  id: string;
  name: string;
  description: string;
  type: string;
  color: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  status: string;
}

export interface PSAccount {
  id: string;
  org_id: string;
  owner_type: string;
  owner_id: string;
  name: string;
  currency: string;
  status: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PSGroup {
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

export interface PSOrgUnit {
  id: string;
  name: string;
  type: string;
  org_id: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PSVersement {
  id: string;
  org_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_cents: number;
  date: string;
  status: string;
  created_by: string;
  approved_by: string;
  approved_at: string;
  comment: string | null;
  created_at: string;
}

export interface PSEventBudget {
  id: string;
  event_id: string;
  currency: string;
  revised_at: string | null;
  revised_by: string | null;
  created_at: string;
}

export interface PSBudgetLine {
  id: string;
  event_budget_id: string;
  category_id: string;
  planned_amount_cents: number;
  actual_amount_cents: number;
  description: string | null;
  created_at: string;
}

export interface PSAuditEntry {
  id: string;
  org_id: string;
  transaction_id: string | null;
  user_id: string;
  actor_role_at_time: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: string | null;
  after_state: string | null;
  comment: string | null;
  created_at: string;
}

// ============================================================
// Internal helper: check if PowerSync is initialized
// ============================================================

let _psReady = false;

function isPowerSyncReady(): boolean {
  return _psReady;
}

function setPowerSyncReady(ready: boolean) {
  _psReady = ready;
}

// ============================================================
// Read hooks - PowerSync first, PowerSync fallback
// ============================================================

/**
 * Hook to get all transactions
 * Tries PowerSync first, falls back to local cache
 */
export function useTransactions() {
  const sync = usePowerSync();
  const store = useLocalStore();

  const { data: psData, status: psStatus } = useQuery<PSTransaction>(
    'SELECT * FROM transactions ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );

  // PowerSync has data and is ready → use it
  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  // Fall back to local cache
  return { data: store.transactions, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all events
 */
export function useEvents() {
  const { data: psData, status: psStatus } = useQuery<PSEvent>(
    'SELECT * FROM events ORDER BY start_date ASC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.events, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all members
 */
export function useMembers() {
  const { data: psData } = useQuery<PSMember>(
    'SELECT * FROM members ORDER BY last_name, first_name',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.members, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all groups
 */
export function useGroups() {
  const { data: psData } = useQuery<PSGroup>(
    'SELECT * FROM groups ORDER BY name',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.groups, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all caisses
 */
export function useCaisses() {
  const { data: psData } = useQuery<PSCaisse>(
    'SELECT * FROM caisses ORDER BY name',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.caisses, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all accounts
 */
export function useAccounts() {
  const { data: psData } = useQuery<PSAccount>(
    'SELECT * FROM accounts ORDER BY name',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.accounts, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all notifications
 */
export function useNotifications() {
  const { data: psData } = useQuery<PSNotification>(
    'SELECT * FROM notifications ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.notifications, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all categories
 */
export function useCategories() {
  const { data: psData } = useQuery<PSCategory>(
    'SELECT * FROM categories ORDER BY label_fr',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.categories, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all org units
 */
export function useOrgUnits() {
  const { data: psData } = useQuery<PSOrgUnit>(
    'SELECT * FROM org_units ORDER BY name',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.orgUnits, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all versements
 */
export function useVersements() {
  const { data: psData } = useQuery<PSVersement>(
    'SELECT * FROM versements ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  // Fallback: derive versements from transactions
  const versementsMap = new Map<string, PSVersement>();
  for (const tx of store.transactions) {
    if (tx.versementId) {
      versementsMap.set(tx.versementId, {
        id: tx.versementId,
        org_id: tx.orgId,
        from_account_id: tx.sourceCaisseId ?? '',
        to_account_id: 'main',
        amount_cents: tx.amount,
        date: tx.date,
        status: tx.status,
        created_by: tx.createdById,
        approved_by: tx.approvedById ?? '',
        approved_at: tx.approvedAt ?? '',
        comment: tx.comment,
        created_at: tx.createdAt,
      });
    }
  }
  return { data: Array.from(versementsMap.values()), isLoading: false, source: 'derived' as const };
}

/**
 * Hook to get all event budgets
 */
export function useEventBudgets() {
  const { data: psData } = useQuery<PSEventBudget>(
    'SELECT * FROM event_budgets ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.eventBudgets, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all budget lines
 */
export function useBudgetLines() {
  const { data: psData } = useQuery<PSBudgetLine>(
    'SELECT * FROM budget_lines ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.budgetLines, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all audit entries
 */
export function useAuditEntries() {
  const { data: psData } = useQuery<PSAuditEntry>(
    'SELECT * FROM audit_entries ORDER BY created_at DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.auditEntries, isLoading: store.isLoading, source: 'indexeddb' as const };
}

// ============================================================
// Migration gate: signal when PowerSync is fully initialized
// ============================================================

/**
 * Call this once after PowerSync is initialized to signal readiness.
 * This should be called from the root component or App.tsx
 */
export function markPowerSyncReady(): void {
  setPowerSyncReady(true);
  console.log('[DataLayer] PowerSync marked as ready');
}

/**
 * Hook that monitors PowerSync status and marks readiness automatically
 */
export function usePowerSyncStatus(): boolean {
  const sync = usePowerSync();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sync) return;

    const unsubscribe = sync.addListener('statusChanged', (status) => {
      if (status.connected && status.hasSynced) {
        setReady(true);
        markPowerSyncReady();
      }
    });

    // Check initial status
    const currentStatus = sync.getStatus();
    if (currentStatus.connected && currentStatus.hasSynced) {
      setReady(true);
      markPowerSyncReady();
    }

    return () => unsubscribe();
  }, [sync]);

  return ready;
}

// ============================================================
// Write operations (PowerSync only)
// ============================================================

/**
 * Execute a raw SQL write via PowerSync
 * Returns the number of rows affected
 */
export async function executeWrite(
  sql: string,
  params: any[] = []
): Promise<number> {
  const sync = usePowerSync();
  const result = await sync.execute(sql, params);
  return result.changes;
}

/**
 * Add a transaction via PowerSync
 */
export async function addTransactionPS(
  tx: Omit<PSTransaction, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
    `INSERT INTO transactions (
      id, org_id, type, amount, description, date, status,
      category_id, org_unit_id, compensates_for, comment,
      version, created_by_id, approved_by_id, created_at,
      updated_at, approved_at, event_id, source, person_name,
      source_caisse_id, versement_id, reversal_of_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tx.org_id,
      tx.type,
      tx.amount,
      tx.description,
      tx.date,
      tx.status,
      tx.category_id,
      tx.org_unit_id,
      tx.compensates_for,
      tx.comment,
      tx.version || 1,
      tx.created_by_id,
      tx.approved_by_id,
      now,
      now,
      tx.approved_at,
      tx.event_id,
      tx.source,
      tx.person_name,
      tx.source_caisse_id,
      tx.versement_id,
      tx.reversal_of_id,
    ]
  );

  return id;
}

/**
 * Update a transaction via PowerSync
 */
export async function updateTransactionPS(
  id: string,
  updates: Partial<PSTransaction>
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSTransaction, string][] = [
    ['type', 'type'],
    ['amount', 'amount'],
    ['description', 'description'],
    ['date', 'date'],
    ['status', 'status'],
    ['category_id', 'category_id'],
    ['org_unit_id', 'org_unit_id'],
    ['event_id', 'event_id'],
    ['comment', 'comment'],
    ['version', 'version'],
    ['approved_by_id', 'approved_by_id'],
    ['approved_at', 'approved_at'],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Delete a transaction via PowerSync
 */
export async function deleteTransactionPS(id: string): Promise<void> {
  await executeWrite('DELETE FROM transactions WHERE id = ?', [id]);
}

/**
 * Add a member via PowerSync
 */
export async function addMemberPS(
  member: Omit<PSMember, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
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

/**
 * Update a member via PowerSync
 */
export async function updateMemberPS(
  id: string,
  updates: Partial<PSMember>
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSMember, string][] = [
    ['first_name', 'first_name'],
    ['last_name', 'last_name'],
    ['phone', 'phone'],
    ['email', 'email'],
    ['status', 'status'],
    ['joined_at', 'joined_at'],
    ['archived_at', 'archived_at'],
    ['archived_by', 'archived_by'],
    ['archive_reason', 'archive_reason'],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE members SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Add an event via PowerSync
 */
export async function addEventPS(
  event: Omit<PSEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
    `INSERT INTO events (
      id, org_id, name, description, start_date, end_date,
      status, budget, created_at, updated_at, budget_items
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.org_id,
      event.name,
      event.description,
      event.start_date,
      event.end_date,
      event.status,
      event.budget,
      now,
      now,
      event.budget_items,
    ]
  );

  return id;
}

/**
 * Update an event via PowerSync
 */
export async function updateEventPS(
  id: string,
  updates: Partial<PSEvent>
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSEvent, string][] = [
    ['name', 'name'],
    ['description', 'description'],
    ['start_date', 'start_date'],
    ['end_date', 'end_date'],
    ['status', 'status'],
    ['budget', 'budget'],
    ['budget_items', 'budget_items'],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Delete an event via PowerSync
 */
export async function deleteEventPS(id: string): Promise<void> {
  await executeWrite('DELETE FROM events WHERE id = ?', [id]);
}
