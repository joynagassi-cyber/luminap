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
import { getPowerSyncDatabase } from '@/lib/powersync';
import { useLocalStore } from '@/store/useLocalStore';
import { useEffect, useState, useRef } from 'react';
import type { CustomFieldDefinition, CustomFieldValue, FormDefinition, FormSubmission } from '@/types';

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
  type: string;
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

export interface PSCotisation {
  id: string;
  culte_id: string;
  membre_id: string;
  statut: string;
  montantObligatoire: number;
  montantPaye: number;
  datePaiement: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PSGroupMembership {
  id: string;
  member_id: string;
  group_id: string;
  role: string;
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

/**
 * Hook to get all cotisations
 */
export function useCotisations() {
  const { data: psData } = useQuery<PSCotisation>(
    'SELECT * FROM cotisations ORDER BY createdAt DESC',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.cotisations, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Hook to get all group memberships
 */
export function useGroupMemberships() {
  const { data: psData } = useQuery<PSGroupMembership>(
    'SELECT * FROM group_memberships',
    [],
    { reportFetching: true }
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: 'powersync' as const };
  }

  return { data: store.memberships, isLoading: store.isLoading, source: 'indexeddb' as const };
}

/**
 * Add a group membership via PowerSync
 */
export async function addGroupMembershipPS(
  groupId: string,
  memberId: string,
  role: string
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO group_memberships (id, member_id, group_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, memberId, groupId, role, now]
  );
  return id;
}

/**
 * Remove a group membership via PowerSync
 */
export async function removeGroupMembershipPS(id: string): Promise<void> {
  await executeWrite(`DELETE FROM group_memberships WHERE id = ?`, [id]);
}

/**
 * Get all group memberships via PowerSync
 */
export async function getGroupMembershipsPS(): Promise<PSGroupMembership[]> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(`SELECT * FROM group_memberships`);
  return (result?.result || []) as PSGroupMembership[];
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
  // Guard: APPROVED transactions are immutable
  // Exception: allow status change TO APPROVED (approve flow)
  const db = getPowerSyncDatabase();
  const statusResult = await db.execute(`SELECT status FROM transactions WHERE id = ?`, [id]);
  const tx = statusResult?.result?.[0] as any;
  if (tx?.status === 'APPROVED' && updates.status !== 'APPROVED') {
    throw new Error('TRANSACTION_APPROVED_IMMUTABLE');
  }

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
  // Guard: APPROVED transactions are immutable
  const db = getPowerSyncDatabase();
  const statusResult = await db.execute(`SELECT status FROM transactions WHERE id = ?`, [id]);
  const tx = statusResult?.result?.[0] as any;
  if (tx?.status === 'APPROVED') {
    throw new Error('TRANSACTION_APPROVED_IMMUTABLE');
  }

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

/**
 * Add a cotisation via PowerSync
 */
export async function addCotisationPS(
  cot: Omit<PSCotisation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
    `INSERT INTO cotisations (
      id, culte_id, membre_id, statut, montantObligatoire, montantPaye,
      datePaiement, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      cot.culte_id,
      cot.membre_id,
      cot.statut,
      cot.montantObligatoire,
      cot.montantPaye,
      cot.datePaiement,
      cot.notes,
      now,
      now,
    ]
  );

  return id;
}

/**
 * Update a cotisation via PowerSync
 */
export async function updateCotisationPS(
  id: string,
  updates: Partial<PSCotisation>
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSCotisation, string][] = [
    ['statut', 'statut'],
    ['montantPaye', 'montantPaye'],
    ['datePaiement', 'datePaiement'],
    ['notes', 'notes'],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push('updatedAt = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE cotisations SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Update member donations and advance
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
    ['total_dons', 'total_dons'],
    ['montant_en_avance', 'montant_en_avance'],
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

// ============================================================
// Custom Field Definitions (PowerSync)
// ============================================================

export async function createCustomFieldDefinitionPS(
  def: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomFieldDefinition> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO custom_field_definitions (id, org_id, entity_type, field_name, field_label, field_type, options, \`order\`, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      def.orgId,
      def.entityType,
      def.key,
      def.label,
      def.type,
      def.options ? JSON.stringify(def.options) : null,
      def.order,
      now,
      now,
    ]
  );
  return { ...def, id, createdAt: now, updatedAt: now };
}

export async function getCustomFieldDefinitionPS(id: string): Promise<CustomFieldDefinition | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT * FROM custom_field_definitions WHERE id = ?`,
    [id]
  );
  const row = result?.result?.[0] as any;
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    entityType: row.entity_type,
    key: row.field_name,
    label: row.field_label,
    type: row.field_type,
    options: row.options ? JSON.parse(row.options) : undefined,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomFieldDefinitionsPS(entityType?: string): Promise<CustomFieldDefinition[]> {
  const db = getPowerSyncDatabase();
  const sql = entityType
    ? `SELECT * FROM custom_field_definitions WHERE entity_type = ?`
    : `SELECT * FROM custom_field_definitions`;
  const result = await db.execute(sql, entityType ? [entityType] : []);
  const rows = (result?.result || []) as any[];
  return rows.map(r => ({
    id: r.id,
    orgId: r.org_id,
    entityType: r.entity_type,
    key: r.field_name,
    label: r.field_label,
    type: r.field_type,
    options: r.options ? JSON.parse(r.options) : undefined,
    order: r.order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateCustomFieldDefinitionPS(
  id: string,
  data: Partial<CustomFieldDefinition>
): Promise<CustomFieldDefinition | null> {
  const existing = await getCustomFieldDefinitionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.entityType !== undefined) { setClauses.push('entity_type = ?'); params.push(data.entityType); }
  if (data.key !== undefined) { setClauses.push('field_name = ?'); params.push(data.key); }
  if (data.label !== undefined) { setClauses.push('field_label = ?'); params.push(data.label); }
  if (data.type !== undefined) { setClauses.push('field_type = ?'); params.push(data.type); }
  if (data.options !== undefined) { setClauses.push('options = ?'); params.push(JSON.stringify(data.options)); }
  if (data.order !== undefined) { setClauses.push('order = ?'); params.push(data.order); }
  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await executeWrite(
    `UPDATE custom_field_definitions SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );
  return merged;
}

export async function deleteCustomFieldDefinitionPS(id: string): Promise<void> {
  await executeWrite('DELETE FROM custom_field_definitions WHERE id = ?', [id]);
  await executeWrite('DELETE FROM custom_field_values WHERE custom_field_definition_id = ?', [id]);
}

// ============================================================
// Custom Field Values (PowerSync)
// ============================================================

export async function upsertCustomFieldValuePS(
  value: Omit<CustomFieldValue, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomFieldValue> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const rowValue = typeof value.value === 'object' && value.value !== null
    ? JSON.stringify(value.value)
    : String(value.value ?? '');
  await executeWrite(
    `INSERT INTO custom_field_values (id, entity_type, entity_id, custom_field_definition_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, value.entityType, value.entityId, value.customFieldDefinitionId, rowValue, now, now]
  );
  return { ...value, id, createdAt: now, updatedAt: now, value: value.value };
}

export async function getCustomFieldValuesByEntityPS(entityType: string, entityId: string): Promise<CustomFieldValue[]> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT * FROM custom_field_values WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId]
  );
  const rows = (result?.result || []) as any[];
  return rows.map(r => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    customFieldDefinitionId: r.custom_field_definition_id,
    value: r.value,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function deleteCustomFieldValuePS(id: string): Promise<void> {
  await executeWrite('DELETE FROM custom_field_values WHERE id = ?', [id]);
}

// ============================================================
// Form Definitions (PowerSync)
// ============================================================

export async function createFormDefinitionPS(
  def: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FormDefinition> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO form_definitions (id, org_id, key, name, description, version, target_entity_type, fields, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      def.orgId,
      def.key,
      def.name,
      def.description ?? null,
      def.version,
      def.targetEntityType ?? null,
      JSON.stringify(def.fields),
      def.status,
      now,
      now,
    ]
  );
  return { ...def, id, createdAt: now, updatedAt: now };
}

export async function getFormDefinitionPS(id: string): Promise<FormDefinition | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(`SELECT * FROM form_definitions WHERE id = ?`, [id]);
  const row = result?.result?.[0] as any;
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    key: row.key,
    name: row.name,
    description: row.description,
    version: row.version,
    targetEntityType: row.target_entity_type,
    fields: JSON.parse(row.fields),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFormDefinitionsPS(filters?: { status?: string; orgId?: string }): Promise<FormDefinition[]> {
  const db = getPowerSyncDatabase();
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters?.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters?.orgId) { conditions.push('org_id = ?'); params.push(filters.orgId); }
  const sql = conditions.length > 0
    ? `SELECT * FROM form_definitions WHERE ${conditions.join(' AND ')}`
    : `SELECT * FROM form_definitions`;
  const result = await db.execute(sql, params);
  const rows = (result?.result || []) as any[];
  return rows.map(r => ({
    id: r.id,
    orgId: r.org_id,
    key: r.key,
    name: r.name,
    description: r.description,
    version: r.version,
    targetEntityType: r.target_entity_type,
    fields: JSON.parse(r.fields),
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateFormDefinitionPS(
  id: string,
  data: Partial<FormDefinition>
): Promise<FormDefinition | null> {
  const existing = await getFormDefinitionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.orgId !== undefined) { setClauses.push('org_id = ?'); params.push(data.orgId); }
  if (data.key !== undefined) { setClauses.push('key = ?'); params.push(data.key); }
  if (data.name !== undefined) { setClauses.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { setClauses.push('description = ?'); params.push(data.description); }
  if (data.version !== undefined) { setClauses.push('version = ?'); params.push(data.version); }
  if (data.targetEntityType !== undefined) { setClauses.push('target_entity_type = ?'); params.push(data.targetEntityType); }
  if (data.fields !== undefined) { setClauses.push('fields = ?'); params.push(JSON.stringify(data.fields)); }
  if (data.status !== undefined) { setClauses.push('status = ?'); params.push(data.status); }
  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await executeWrite(`UPDATE form_definitions SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return merged;
}

export async function deleteFormDefinitionPS(id: string): Promise<void> {
  await executeWrite('DELETE FROM form_definitions WHERE id = ?', [id]);
}

// ============================================================
// Form Submissions (PowerSync)
// ============================================================

export async function createFormSubmissionPS(
  sub: Omit<FormSubmission, 'id' | 'submittedAt' | 'createdAt'>
): Promise<FormSubmission> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO form_submissions (id, org_id, form_definition_id, form_version, entity_type, entity_id, data, submitted_by, submitted_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      sub.orgId,
      sub.formDefinitionId,
      sub.formVersion,
      sub.linkedEntityType ?? null,
      sub.linkedEntityId ?? null,
      JSON.stringify(sub.data),
      sub.submittedBy,
      now,
      sub.status,
      now,
    ]
  );
  return { ...sub, id, submittedAt: now, createdAt: now };
}

export async function getFormSubmissionPS(id: string): Promise<FormSubmission | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(`SELECT * FROM form_submissions WHERE id = ?`, [id]);
  const row = result?.result?.[0] as any;
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.org_id,
    formDefinitionId: row.form_definition_id,
    formVersion: row.form_version,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    data: JSON.parse(row.data),
    linkedEntityType: row.entity_type,
    linkedEntityId: row.entity_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listFormSubmissionsPS(filters?: { formDefinitionId?: string; status?: string; entityId?: string }): Promise<FormSubmission[]> {
  const db = getPowerSyncDatabase();
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters?.formDefinitionId) { conditions.push('form_definition_id = ?'); params.push(filters.formDefinitionId); }
  if (filters?.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters?.entityId) { conditions.push('entity_id = ?'); params.push(filters.entityId); }
  const sql = conditions.length > 0
    ? `SELECT * FROM form_submissions WHERE ${conditions.join(' AND ')}`
    : `SELECT * FROM form_submissions`;
  const result = await db.execute(sql, params);
  const rows = (result?.result || []) as any[];
  return rows.map(r => ({
    id: r.id,
    orgId: r.org_id,
    formDefinitionId: r.form_definition_id,
    formVersion: r.form_version,
    submittedBy: r.submitted_by,
    submittedAt: r.submitted_at,
    data: JSON.parse(r.data),
    linkedEntityType: r.entity_type,
    linkedEntityId: r.entity_id,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function updateFormSubmissionPS(
  id: string,
  data: Partial<FormSubmission>
): Promise<FormSubmission | null> {
  const existing = await getFormSubmissionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.orgId !== undefined) { setClauses.push('org_id = ?'); params.push(data.orgId); }
  if (data.formDefinitionId !== undefined) { setClauses.push('form_definition_id = ?'); params.push(data.formDefinitionId); }
  if (data.formVersion !== undefined) { setClauses.push('form_version = ?'); params.push(data.formVersion); }
  if (data.linkedEntityType !== undefined) { setClauses.push('entity_type = ?'); params.push(data.linkedEntityType); }
  if (data.linkedEntityId !== undefined) { setClauses.push('entity_id = ?'); params.push(data.linkedEntityId); }
  if (data.data !== undefined) { setClauses.push('data = ?'); params.push(JSON.stringify(data.data)); }
  if (data.status !== undefined) { setClauses.push('status = ?'); params.push(data.status); }
  await executeWrite(`UPDATE form_submissions SET ${setClauses.join(', ')} WHERE id = ?`, params);
  return merged;
}

