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

import { useQuery, usePowerSync } from "@powersync/react";
import type { PowerSyncDatabase } from "@powersync/web";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { useLocalStore } from "@/store/useLocalStore";
import { useEffect, useState, useRef } from "react";
import type {
  CustomFieldDefinition,
  CustomFieldValue,
  FormDefinition,
  FormSubmission,
} from "@/types";
import { getOrganizationId } from "./orgContext";
import { get, set, invalidate, asyncGetOrSet } from "./cache";


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
  total_dons?: number;
  montant_en_avance?: number;
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
  cotisation_id: string | null;
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
  // Optional on the TS side: addCotisationPS fills it via getOrganizationId()
  // and Omit<PSCotisation, "id"|"org_id"|...> keeps callers from having to
  // supply it explicitly. The DB column is NOT NULL with a default.
  org_id: string;
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
  const orgId = getOrganizationId();

  // CPU-tier cache: 60s TTL, invalidates on transaction writes
  const cached = get<PSTransaction[]>("txs:" + orgId);
  if (cached)
    return { data: cached, isLoading: false, source: "cached" as const };

  const { data: psData, isLoading: psStatus } = useQuery<PSTransaction>(
    "SELECT id, org_id, type, amount, description, date, status, category_id, org_unit_id, event_id, source, person_name, compensates_for, comment, version, source_caisse_id, versement_id, reversal_of_id, created_by_id, approved_by_id, created_at, updated_at, approved_at FROM transactions WHERE org_id = ? ORDER BY created_at DESC",
    [orgId],
    { reportFetching: true },
  );

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    set("txs:" + orgId, psData, { tier: "cpu" });
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.transactions,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all events
 */
export function useEvents() {
  const { data: psData, isLoading: psStatus } = useQuery<PSEvent>(
    "SELECT id, org_id, name, description, start_date, end_date, status, type, budget, budget_items, created_at, updated_at FROM events WHERE org_id = ? ORDER BY start_date ASC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.events,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all members
 */
export function useMembers() {
  const { data: psData } = useQuery<PSMember>(
    "SELECT id, org_id, first_name, last_name, phone, email, status, joined_at, archived_at, archived_by, archive_reason, total_dons, montant_en_avance, created_at, updated_at FROM members WHERE org_id = ? ORDER BY last_name, first_name",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.members,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all groups
 */
export function useGroups() {
  const { data: psData } = useQuery<PSGroup>(
    "SELECT id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at FROM groups WHERE org_id = ? ORDER BY name",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.groups,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all caisses
 */
export function useCaisses() {
  const { data: psData } = useQuery<PSCaisse>(
    "SELECT id, name, description, type, color, org_id, created_at, updated_at, archived_at, archived_by, archive_reason, status FROM caisses WHERE org_id = ? ORDER BY name",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.caisses,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all accounts
 */
export function useAccounts() {
  const { data: psData } = useQuery<PSAccount>(
    "SELECT id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at FROM accounts WHERE org_id = ? ORDER BY name",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.accounts,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all notifications
 */
export function useNotifications() {
  const { data: psData } = useQuery<PSNotification>(
    "SELECT id, org_id, action_type, title, message, is_read, source_transaction_id, created_at FROM notifications WHERE org_id = ? ORDER BY created_at DESC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.notifications,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all categories
 */
export function useCategories() {
  const { data: psData } = useQuery<PSCategory>(
    "SELECT id, key, label_fr, type, org_id, created_at FROM categories WHERE org_id = ? ORDER BY label_fr",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.categories,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all org units
 */
export function useOrgUnits() {
  const { data: psData } = useQuery<PSOrgUnit>(
    "SELECT id, name, type, org_id, description, is_active, created_at, updated_at FROM org_units WHERE org_id = ? ORDER BY name",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.orgUnits,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all versements
 */
export function useVersements() {
  const { data: psData } = useQuery<PSVersement>(
    "SELECT id, org_id, from_account_id, to_account_id, amount_cents, date, status, created_by, approved_by, approved_at, comment, created_at FROM versements WHERE org_id = ? ORDER BY created_at DESC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  // Fallback: derive versements from transactions
  const versementsMap = new Map<string, PSVersement>();
  for (const tx of store.transactions) {
    if (tx.versementId) {
      versementsMap.set(tx.versementId, {
        id: tx.versementId,
        org_id: tx.orgId,
        from_account_id: tx.sourceCaisseId ?? "",
        to_account_id: "main",
        amount_cents: tx.amount,
        date: tx.date,
        status: tx.status,
        created_by: tx.createdById,
        approved_by: tx.approvedById ?? "",
        approved_at: tx.approvedAt ?? "",
        comment: tx.comment,
        created_at: tx.createdAt,
      });
    }
  }
  return {
    data: Array.from(versementsMap.values()),
    isLoading: false,
    source: "derived" as const,
  };
}

/**
 * Hook to get all event budgets
 */
export function useEventBudgets() {
  const { data: psData } = useQuery<PSEventBudget>(
    "SELECT id, event_id, currency, revised_at, revised_by, created_at FROM event_budgets ORDER BY created_at DESC",
    [],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.eventBudgets,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all budget lines
 */
export function useBudgetLines() {
  const { data: psData } = useQuery<PSBudgetLine>(
    "SELECT id, event_budget_id, category_id, planned_amount_cents, actual_amount_cents, description, created_at FROM budget_lines ORDER BY created_at DESC",
    [],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.budgetLines,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all audit entries
 */
export function useAuditEntries() {
  const { data: psData } = useQuery<PSAuditEntry>(
    "SELECT id, org_id, transaction_id, user_id, actor_role_at_time, action, entity_type, entity_id, before_state, after_state, comment, created_at FROM audit_entries WHERE org_id = ? ORDER BY created_at DESC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.auditEntries,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all cotisations
 */
export function useCotisations() {
  const { data: psData } = useQuery<PSCotisation>(
    "SELECT id, org_id, culte_id, membre_id, statut, montantObligatoire, montantPaye, datePaiement, notes, createdAt, updatedAt FROM cotisations WHERE org_id = ? ORDER BY createdAt DESC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.cotisations,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Hook to get all group memberships
 */
export function useGroupMemberships() {
  const { data: psData } = useQuery<PSGroupMembership>(
    "SELECT id, member_id, group_id, role, created_at FROM group_memberships",
    [],
    { reportFetching: true },
  );
  const store = useLocalStore();

  if (psData && psData.length > 0 && isPowerSyncReady()) {
    return { data: psData, isLoading: false, source: "powersync" as const };
  }

  return {
    data: store.memberships,
    isLoading: store.isLoading,
    source: "indexeddb" as const,
  };
}

/**
 * Add a group membership via PowerSync
 */
export async function addGroupMembershipPS(
  groupId: string,
  memberId: string,
  role: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO group_memberships (id, member_id, group_id, role, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, memberId, groupId, role, now],
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
  const result = await db.execute(
    `SELECT id, member_id, group_id, role, created_at FROM group_memberships`,
  );
  return (result?.array || []) as any[] as PSGroupMembership[];
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
}

/**
 * Hook that monitors PowerSync status and marks readiness automatically
 */
export function usePowerSyncStatus(): boolean {
  const sync = usePowerSync();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sync) return;

    const unsubscribe = (sync as any).addListener?.("statusChanged", (status: any) => {
      if (status?.connected && status?.hasSynced) {
        setReady(true);
        markPowerSyncReady();
      }
    });

    // Check initial status
    const currentStatus = (sync as any).getStatus?.();
    if (currentStatus?.connected && currentStatus?.hasSynced) {
      setReady(true);
      markPowerSyncReady();
    }

    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
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
  params: any[] = [],
): Promise<number> {
  const sync = usePowerSync();
  const result = await sync.execute(sql, params);
  return result.rowsAffected ?? 1;
}

/**
 * Add a transaction via PowerSync
 */
export async function addTransactionPS(
  tx: Omit<PSTransaction, "id" | "created_at" | "updated_at" | "version">,
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
      1,
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
    ],
  );

  return id;
}

/**
 * Update a transaction via PowerSync
 */
export async function updateTransactionPS(
  id: string,
  updates: Partial<PSTransaction>,
): Promise<void> {
  // Guard: APPROVED transactions are immutable
  // Exception: allow status change TO APPROVED (approve flow)
  const db = getPowerSyncDatabase();
  const statusResult = await db.execute(
    `SELECT status FROM transactions WHERE id = ?`,
    [id],
  );
  const tx = statusResult?.array?.[0] as any;
  if (tx?.status === "APPROVED" && updates.status !== "APPROVED") {
    throw new Error("TRANSACTION_APPROVED_IMMUTABLE");
  }

  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSTransaction, string][] = [
    ["type", "type"],
    ["amount", "amount"],
    ["description", "description"],
    ["date", "date"],
    ["status", "status"],
    ["category_id", "category_id"],
    ["org_unit_id", "org_unit_id"],
    ["event_id", "event_id"],
    ["comment", "comment"],
    ["version", "version"],
    ["approved_by_id", "approved_by_id"],
    ["approved_at", "approved_at"],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE transactions SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
}

/**
 * Delete a transaction via PowerSync
 */
export async function deleteTransactionPS(id: string): Promise<void> {
  // Guard: APPROVED transactions are immutable
  const db = getPowerSyncDatabase();
  const statusResult = await db.execute(
    `SELECT status FROM transactions WHERE id = ?`,
    [id],
  );
  const tx = statusResult?.array?.[0] as any;
  if (tx?.status === "APPROVED") {
    throw new Error("TRANSACTION_APPROVED_IMMUTABLE");
  }

  await executeWrite("DELETE FROM transactions WHERE id = ?", [id]);
}

/**
 * Add a member via PowerSync
 */
export async function addMemberPS(
  member: Omit<PSMember, "id" | "created_at" | "updated_at">,
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
    ],
  );

  return id;
}

/**
 * Add an event via PowerSync
 */
export async function addEventPS(
  event: Omit<PSEvent, "id" | "created_at" | "updated_at">,
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
    ],
  );

  return id;
}

/**
 * Update an event via PowerSync
 */
export async function updateEventPS(
  id: string,
  updates: Partial<PSEvent>,
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSEvent, string][] = [
    ["name", "name"],
    ["description", "description"],
    ["start_date", "start_date"],
    ["end_date", "end_date"],
    ["status", "status"],
    ["budget", "budget"],
    ["budget_items", "budget_items"],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE events SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
}

/**
 * Delete an event via PowerSync
 */
export async function deleteEventPS(id: string): Promise<void> {
  await executeWrite("DELETE FROM events WHERE id = ?", [id]);
}

/**
 * Add a cotisation via PowerSync
 */
export async function addCotisationPS(
  cot: Omit<PSCotisation, "id" | "org_id" | "createdAt" | "updatedAt">,
  orgId?: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const effOrgId = orgId ?? getOrganizationId();

  await executeWrite(
    `INSERT INTO cotisations (
      id, org_id, culte_id, membre_id, statut, montantObligatoire, montantPaye,
      datePaiement, notes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      effOrgId,
      cot.culte_id,
      cot.membre_id,
      cot.statut,
      cot.montantObligatoire,
      cot.montantPaye,
      cot.datePaiement,
      cot.notes,
      now,
      now,
    ],
  );

  return id;
}

/**
 * Update a cotisation via PowerSync
 */
export async function updateCotisationPS(
  id: string,
  updates: Partial<PSCotisation>,
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSCotisation, string][] = [
    ["statut", "statut"],
    ["montantPaye", "montantPaye"],
    ["datePaiement", "datePaiement"],
    ["notes", "notes"],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push("updatedAt = ?");
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE cotisations SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
}

/**
 * Update member donations and advance
 */
export async function updateMemberPS(
  id: string,
  updates: Partial<PSMember>,
): Promise<void> {
  const setClauses: string[] = [];
  const params: any[] = [];

  const fieldMap: [keyof PSMember, string][] = [
    ["first_name", "first_name"],
    ["last_name", "last_name"],
    ["phone", "phone"],
    ["email", "email"],
    ["status", "status"],
    ["joined_at", "joined_at"],
    ["archived_at", "archived_at"],
    ["archived_by", "archived_by"],
    ["archive_reason", "archive_reason"],
    ["total_dons", "total_dons"],
    ["montant_en_avance", "montant_en_avance"],
  ];

  for (const [key, col] of fieldMap) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = ?`);
      params.push(updates[key]);
    }
  }

  setClauses.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);

  await executeWrite(
    `UPDATE members SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
}

// ============================================================
// Custom Field Definitions (PowerSync)
// ============================================================

export async function createCustomFieldDefinitionPS(
  def: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt">,
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
    ],
  );
  return { ...def, id, createdAt: now, updatedAt: now };
}

export async function getCustomFieldDefinitionPS(
  id: string,
): Promise<CustomFieldDefinition | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT id, org_id, entity_type, field_name, field_label, field_type, options, \`order\`, created_at, updated_at FROM custom_field_definitions WHERE id = ?`,
    [id],
  );
  const row = result?.array?.[0] as any;
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

export async function listCustomFieldDefinitionsPS(
  entityType?: string,
): Promise<CustomFieldDefinition[]> {
  const db = getPowerSyncDatabase();
  const sql = entityType
    ? `SELECT id, org_id, entity_type, field_name, field_label, field_type, options, \`order\`, created_at, updated_at FROM custom_field_definitions WHERE entity_type = ?`
    : `SELECT id, org_id, entity_type, field_name, field_label, field_type, options, \`order\`, created_at, updated_at FROM custom_field_definitions`;
  const result = await db.execute(sql, entityType ? [entityType] : []);
  const rows = (result?.array || []) as any[];
  return rows.map((r) => ({
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
  data: Partial<CustomFieldDefinition>,
): Promise<CustomFieldDefinition | null> {
  const existing = await getCustomFieldDefinitionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.entityType !== undefined) {
    setClauses.push("entity_type = ?");
    params.push(data.entityType);
  }
  if (data.key !== undefined) {
    setClauses.push("field_name = ?");
    params.push(data.key);
  }
  if (data.label !== undefined) {
    setClauses.push("field_label = ?");
    params.push(data.label);
  }
  if (data.type !== undefined) {
    setClauses.push("field_type = ?");
    params.push(data.type);
  }
  if (data.options !== undefined) {
    setClauses.push("options = ?");
    params.push(JSON.stringify(data.options));
  }
  if (data.order !== undefined) {
    setClauses.push("order = ?");
    params.push(data.order);
  }
  setClauses.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);
  await executeWrite(
    `UPDATE custom_field_definitions SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
  return merged;
}

export async function deleteCustomFieldDefinitionPS(id: string): Promise<void> {
  await executeWrite("DELETE FROM custom_field_definitions WHERE id = ?", [id]);
  await executeWrite(
    "DELETE FROM custom_field_values WHERE custom_field_definition_id = ?",
    [id],
  );
}

// ============================================================
// Custom Field Values (PowerSync)
// ============================================================

export async function upsertCustomFieldValuePS(
  value: Omit<CustomFieldValue, "id" | "createdAt" | "updatedAt">,
): Promise<CustomFieldValue> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const rowValue =
    typeof value.value === "object" && value.value !== null
      ? JSON.stringify(value.value)
      : String(value.value ?? "");
  await executeWrite(
    `INSERT INTO custom_field_values (id, entity_type, entity_id, custom_field_definition_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      value.entityType,
      value.entityId,
      value.customFieldDefinitionId,
      rowValue,
      now,
      now,
    ],
  );
  return { ...value, id, createdAt: now, updatedAt: now, value: value.value };
}

export async function getCustomFieldValuesByEntityPS(
  entityType: string,
  entityId: string,
): Promise<CustomFieldValue[]> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT id, entity_type, entity_id, custom_field_definition_id, value, created_at, updated_at FROM custom_field_values WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
  );
  const rows = (result?.array || []) as any[];
  return rows.map((r) => ({
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
  await executeWrite("DELETE FROM custom_field_values WHERE id = ?", [id]);
}

// ============================================================
// Form Definitions (PowerSync)
// ============================================================

export async function createFormDefinitionPS(
  def: Omit<FormDefinition, "id" | "createdAt" | "updatedAt">,
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
    ],
  );
  return { ...def, id, createdAt: now, updatedAt: now };
}

export async function getFormDefinitionPS(
  id: string,
): Promise<FormDefinition | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT id, org_id, key, name, description, version, target_entity_type, fields, status, created_at, updated_at FROM form_definitions WHERE id = ?`,
    [id],
  );
  const row = result?.array?.[0] as any;
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

export async function listFormDefinitionsPS(filters?: {
  status?: string;
  orgId?: string;
}): Promise<FormDefinition[]> {
  const db = getPowerSyncDatabase();
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters?.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.orgId) {
    conditions.push("org_id = ?");
    params.push(filters.orgId);
  }
  const sql =
    conditions.length > 0
      ? `SELECT id, org_id, key, name, description, version, target_entity_type, fields, status, created_at, updated_at FROM form_definitions WHERE ${conditions.join(" AND ")}`
      : `SELECT id, org_id, key, name, description, version, target_entity_type, fields, status, created_at, updated_at FROM form_definitions`;
  const result = await db.execute(sql, params);
  const rows = (result?.array || []) as any[];
  return rows.map((r) => ({
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
  data: Partial<FormDefinition>,
): Promise<FormDefinition | null> {
  const existing = await getFormDefinitionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.orgId !== undefined) {
    setClauses.push("org_id = ?");
    params.push(data.orgId);
  }
  if (data.key !== undefined) {
    setClauses.push("key = ?");
    params.push(data.key);
  }
  if (data.name !== undefined) {
    setClauses.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    setClauses.push("description = ?");
    params.push(data.description);
  }
  if (data.version !== undefined) {
    setClauses.push("version = ?");
    params.push(data.version);
  }
  if (data.targetEntityType !== undefined) {
    setClauses.push("target_entity_type = ?");
    params.push(data.targetEntityType);
  }
  if (data.fields !== undefined) {
    setClauses.push("fields = ?");
    params.push(JSON.stringify(data.fields));
  }
  if (data.status !== undefined) {
    setClauses.push("status = ?");
    params.push(data.status);
  }
  setClauses.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(id);
  await executeWrite(
    `UPDATE form_definitions SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
  return merged;
}

export async function deleteFormDefinitionPS(id: string): Promise<void> {
  await executeWrite("DELETE FROM form_definitions WHERE id = ?", [id]);
}

// ============================================================
// Invitation Hooks (PowerSync)
// ============================================================

export interface PSInvitation {
  id: string;
  org_id: string;
  code: string;
  target_role: string;
  target_scope_type: string;
  target_group_id: string | null;
  target_member_id: string | null;
  issued_by: string;
  issued_at: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  status: string;
}

export interface PSInvitationClaim {
  id: string;
  invitation_id: string;
  claimed_by_device_id: string | null;
  claimed_at: string;
  resulting_user_id: string | null;
  status: string;
  reject_reason: string | null;
}

/**
 * Hook to get all invitations
 */
export function useInvitations() {
  const { data: psData } = useQuery<PSInvitation>(
    "SELECT id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id, issued_by, issued_at, expires_at, max_uses, used_count, status FROM invitations WHERE org_id = ? ORDER BY created_at DESC",
    [getOrganizationId()],
    { reportFetching: true },
  );
  return { data: psData, isLoading: false, source: "powersync" as const };
}

/**
 * Hook to get invitation claims for an invitation
 */
export function useInvitationClaims(invitationId: string | null) {
  const { data: psData } = useQuery<PSInvitationClaim>(
    "SELECT id, invitation_id, claimed_by_device_id, claimed_at, resulting_user_id, status, reject_reason FROM invitation_claims WHERE invitation_id = ? ORDER BY claimed_at ASC",
    invitationId ? [invitationId] : [],
    { reportFetching: false },
  );
  return { data: psData, isLoading: false };
}

// ============================================================
// Invitation Write Operations (PowerSync)
// ============================================================

/**
 * Create an invitation via PowerSync
 */
export async function createInvitationPS(
  inv: Omit<
    PSInvitation,
    "id" | "issued_at" | "expires_at" | "used_count" | "status" | "created_at" | "updated_at"
  >,
  expiresAt: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
    `INSERT INTO invitations (
      id, org_id, code, target_role, target_scope_type, target_group_id, target_member_id,
      issued_by, issued_at, expires_at, max_uses, used_count, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', ?, ?)`,
    [
      id,
      inv.org_id,
      inv.code,
      inv.target_role,
      inv.target_scope_type,
      inv.target_group_id,
      inv.target_member_id,
      inv.issued_by,
      now,
      expiresAt,
      inv.max_uses,
      now,
      now,
    ],
  );

  return id;
}

/**
 * Revoke an invitation via PowerSync
 */
export async function revokeInvitationPS(id: string): Promise<void> {
  await executeWrite(
    `UPDATE invitations SET status = 'REVOKED', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id],
  );
}

/**
 * Create an invitation claim via PowerSync
 */
export async function claimInvitationPS(
  invitationId: string,
  claimedByDeviceId: string | null,
  resultingUserId: string | null,
  status: string,
  rejectReason: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await executeWrite(
    `INSERT INTO invitation_claims (
      id, invitation_id, claimed_by_device_id, claimed_at, resulting_user_id, status, reject_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      invitationId,
      claimedByDeviceId,
      now,
      resultingUserId,
      status,
      rejectReason,
      now,
      now,
    ],
  );

  // Increment used_count on the invitation
  await executeWrite(
    `UPDATE invitations SET used_count = used_count + 1, updated_at = ? WHERE id = ?`,
    [now, invitationId],
  );

  return id;
}

// ============================================================
// Multi-org Administration (PowerSync)
//   - organizations registry (lifecycle PENDING/ACTIVE/SUSPENDED/ARCHIVED)
//   - org_admins grants (central admin → organisation)
// ============================================================

export type OrgStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type OrgType = "CENTRAL" | "CHURCH" | "SCHOOL" | "ENTERPRISE";

/** User courant (identique à useCurrentUser : localStorage "lumina-user"). */
function getCurrentUserId(): string {
  try {
    const stored = localStorage.getItem("lumina-user");
    if (stored) return ((JSON.parse(stored) as { id?: string }).id) ?? "";
  } catch {
    // storage indisponible (SSR / test) → aucun utilisateur
  }
  return "";
}

export interface PSOrganization {
  id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  suspended_at: string | null;
  suspended_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PSOrgAdmin {
  id: string;
  admin_profile_id: string;
  org_id: string;
  status: "ACTIVE" | "REVOKED";
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to list organizations.
 * - "mine"    : l'organisation courante (orgContext).
 * - "central" : toutes les orgs gérées par l'admin central courant —
 *               dérivées LOCALEMENT des tables synchronisées (org_admins +
 *               profiles), car la fonction PG `is_org_member` n'existe pas
 *               dans SQLite PowerSync. L'accès est ensuite garanti côté
 *               serveur par RLS (le Sync Stream ne renvoie que les lignes
 *               visibles par l'utilisateur connecté).
 */
export function useOrganizations(view: "mine" | "central" = "mine") {
  const sql =
    view === "central"
      ? `SELECT o.id, o.name, o.type, o.status, o.suspended_at, o.suspended_by,
                o.archived_at, o.archived_by, o.archive_reason, o.created_at, o.updated_at
         FROM organizations o
         WHERE EXISTS (SELECT 1 FROM org_admins ga
                       WHERE ga.org_id = o.id AND ga.status = 'ACTIVE'
                         AND ga.admin_profile_id = :uid)
            OR EXISTS (SELECT 1 FROM profiles p
                       WHERE p.org_id = o.id AND p.id = :uid)
         ORDER BY o.name`
      : `SELECT id, name, type, status, suspended_at, suspended_by,
                archived_at, archived_by, archive_reason, created_at, updated_at
         FROM organizations WHERE id = ?`;
  const params: any =
    view === "central" ? [{ uid: getCurrentUserId() }] : [getOrganizationId()];
  const { data: psData } = useQuery<PSOrganization>(sql, params, {
    reportFetching: true,
  });
  return { data: psData, isLoading: false, source: "powersync" as const };
}

/**
 * Hook to list grants (org_admins) for the current user or for an organization.
 */
export function useOrgAdmins(orgId?: string | null) {
  const { data: psData } = useQuery<PSOrgAdmin>(
    orgId
      ? "SELECT * FROM org_admins WHERE org_id = ? ORDER BY created_at DESC"
      : "SELECT * FROM org_admins WHERE admin_profile_id = ? ORDER BY created_at DESC",
    orgId ? [orgId] : [getCurrentUserId()],
    { reportFetching: true },
  );
  return { data: psData, isLoading: false, source: "powersync" as const };
}

/**
 * Fetch org admins with their profile info (first/last name, email).
 * Returns rows joined against profiles so the central admin sees
 * WHO the admins are, not just UUIDs.
 */
export interface PSOrgAdminWithProfile extends PSOrgAdmin {
  first_name: string;
  last_name: string;
  email: string;
}

export async function getOrgAdminsFull(
  orgId: string,
): Promise<PSOrgAdminWithProfile[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT ga.id, ga.admin_profile_id, ga.org_id, ga.status, ga.granted_by,
            ga.created_at, ga.updated_at,
            p.first_name, p.last_name, p.email
     FROM org_admins ga
     LEFT JOIN profiles p ON p.id = ga.admin_profile_id
     WHERE ga.org_id = ?
     ORDER BY ga.created_at DESC`,
    [orgId],
  );
  const rows = res?.array ?? [];
  return rows.map((r: any) => ({
    id: String(r.id),
    admin_profile_id: String(r.admin_profile_id),
    org_id: String(r.org_id),
    status: String(r.status),
    granted_by: (r.granted_by as string | null) ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    first_name: String(r.first_name ?? ""),
    last_name: String(r.last_name ?? ""),
    email: String(r.email ?? ""),
  }));
}

/**
 * Grant check against local SQLite (PowerSync).
 * TRUE only when a local ACTIVE grant exists for (user, org) — this is the
 * reliable (non-UI) context-switch authorization, spec §9/§21.
 * Async: PowerSync 2.x exposes no synchronous query API.
 */
export async function hasActiveOrgAdminGrant(
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (!userId || !orgId) return false;
  try {
    const db = getPowerSyncDatabase();
    const row = await db.getOptional<number>(
      `SELECT 1 FROM org_admins WHERE admin_profile_id = ? AND org_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [userId, orgId],
    );
    return row !== null && row !== undefined;
  } catch {
    // PowerSync not open yet (app startup) → refuse context entry, not allow.
    return false;
  }
}

// ─── Multi-org access (local, mirrors server `is_org_member`) ─────────────

/**
 * Local equivalent of PostgreSQL `public.is_org_member(uid, org_id)`:
 * the user is a MEMBER of the org (profiles.org_id) OR holds an ACTIVE
 * central grant (org_admins). This is what authorizes entering an org
 * context. The server still re-enforces it via RLS on every real query.
 */
export async function canAccessOrganization(
  userId: string,
  orgId: string,
): Promise<boolean> {
  if (!userId || !orgId) return false;
  try {
    const db = getPowerSyncDatabase();
    const row = await db.getOptional<number>(
      `SELECT 1 FROM profiles WHERE id = ? AND org_id = ?
       UNION SELECT 1 FROM org_admins
         WHERE admin_profile_id = ? AND org_id = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [userId, orgId, userId, orgId],
    );
    return row !== null && row !== undefined;
  } catch {
    return false;
  }
}

export interface UserOrg {
  orgId: string;
  name: string;
  status: OrgStatus;
  /** How the user is linked to the org */
  via: "MEMBER" | "GRANT" | "BOTH";
}

/**
 * List all organizations the user may enter (member of, or granted admin on),
 * joined with the registry for name + lifecycle status. Sorted by name.
 */
export async function listUserOrgs(userId: string): Promise<UserOrg[]> {
  if (!userId) return [];
  try {
    const db = getPowerSyncDatabase();
    const rows = await db.readTransaction(async (tx) => {
      const res = await tx.execute(
        `SELECT o.id AS orgId, o.name AS name, o.status AS status,
                CASE WHEN m.id IS NOT NULL AND g.id IS NOT NULL THEN 'BOTH'
                     WHEN m.id IS NOT NULL THEN 'MEMBER'
                     ELSE 'GRANT' END AS via
         FROM organizations o
         LEFT JOIN profiles m ON m.org_id = o.id AND m.id = ?
         LEFT JOIN org_admins g ON g.org_id = o.id AND g.admin_profile_id = ?
                AND g.status = 'ACTIVE'
         WHERE m.id IS NOT NULL OR g.id IS NOT NULL
         ORDER BY o.name COLLATE NOCASE`,
        [userId, userId],
      );
      return res.array ?? [];
    });
    return rows.map((r) => ({
      orgId: String(r.orgId),
      name: String(r.name),
      status: (r.status as OrgStatus) ?? "PENDING",
      via: (r.via as UserOrg["via"]) ?? "MEMBER",
    }));
  } catch {
    return [];
  }
}

// ─── Multi-org write operations ─────────────────────────────────────────────

/**
 * Create a new organization (registry row).
 * Server RLS restricts INSERT to admins holding an active grant (migration T3).
 */
export async function createOrganizationPS(input: {
  id: string;
  name: string;
  type?: OrgType;
}): Promise<string> {
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO organizations (id, name, type, status, created_at, updated_at)
     VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    [input.id, input.name, input.type ?? "CHURCH", now, now],
  );
  return input.id;
}

/**
 * Suspend an organization (lifecycle). History is preserved (ARCHIVED ≠ DELETE).
 */
export async function setOrganizationStatusPS(
  orgId: string,
  status: Extract<OrgStatus, "ACTIVE" | "SUSPENDED" | "ARCHIVED">,
  actorId: string,
  reason?: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (status === "SUSPENDED") {
    await executeWrite(
      `UPDATE organizations SET status = 'SUSPENDED', suspended_at = ?, suspended_by = ?, updated_at = ? WHERE id = ?`,
      [now, actorId, now, orgId],
    );
  } else if (status === "ARCHIVED") {
    await executeWrite(
      `UPDATE organizations SET status = 'ARCHIVED', archived_at = ?, archived_by = ?, archive_reason = ?, updated_at = ? WHERE id = ?`,
      [now, actorId, reason ?? null, now, orgId],
    );
  } else {
    // Reactivate: clear suspended flags
    await executeWrite(
      `UPDATE organizations SET status = 'ACTIVE', suspended_at = NULL, suspended_by = NULL, updated_at = ? WHERE id = ?`,
      [now, orgId],
    );
  }
}

/**
 * Grant a central admin on an organization.
 */
export async function grantOrgAdminPS(input: {
  adminProfileId: string;
  orgId: string;
  grantedBy: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await executeWrite(
    `INSERT INTO org_admins (id, admin_profile_id, org_id, status, granted_by, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?)`,
    [id, input.adminProfileId, input.orgId, input.grantedBy, now, now],
  );
  return id;
}

/**
 * Revoke a central admin grant (status → REVOKED; RLS drops access instantly).
 */
export async function revokeOrgAdminPS(grantId: string): Promise<void> {
  await executeWrite(
    `UPDATE org_admins SET status = 'REVOKED', updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), grantId],
  );
}

// ============================================================
// Form Submissions (PowerSync)
// ============================================================

export async function createFormSubmissionPS(
  sub: Omit<FormSubmission, "id" | "submittedAt" | "createdAt">,
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
    ],
  );
  return { ...sub, id, submittedAt: now, createdAt: now };
}

export async function getFormSubmissionPS(
  id: string,
): Promise<FormSubmission | null> {
  const db = getPowerSyncDatabase();
  const result = await db.execute(
    `SELECT id, org_id, form_definition_id, form_version, entity_type, entity_id, data, submitted_by, submitted_at, status, created_at FROM form_submissions WHERE id = ?`,
    [id],
  );
  const row = result?.array?.[0] as any;
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

export async function listFormSubmissionsPS(filters?: {
  formDefinitionId?: string;
  status?: string;
  entityId?: string;
}): Promise<FormSubmission[]> {
  const db = getPowerSyncDatabase();
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters?.formDefinitionId) {
    conditions.push("form_definition_id = ?");
    params.push(filters.formDefinitionId);
  }
  if (filters?.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  if (filters?.entityId) {
    conditions.push("entity_id = ?");
    params.push(filters.entityId);
  }
  const sql =
    conditions.length > 0
      ? `SELECT id, org_id, form_definition_id, form_version, entity_type, entity_id, data, submitted_by, submitted_at, status, created_at FROM form_submissions WHERE ${conditions.join(" AND ")}`
      : `SELECT id, org_id, form_definition_id, form_version, entity_type, entity_id, data, submitted_by, submitted_at, status, created_at FROM form_submissions`;
  const result = await db.execute(sql, params);
  const rows = (result?.array || []) as any[];
  return rows.map((r) => ({
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

/**
 * Create a group (org unit, group, account, caisse) via PowerSync
 */
export async function createGroupPS(
  params: { name: string; type: string; description: string },
): Promise<string> {
  const now = new Date().toISOString();
  const orgId = getOrganizationId();
  const id = crypto.randomUUID();

  // org_units
  await executeWrite(
    `INSERT INTO org_units (id, name, type, org_id, description, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, params.name, params.type, orgId, params.description ?? "", now, now],
  );

  // groups
  await executeWrite(
    `INSERT INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, null, null, 'ACTIVE', null, null, null, ?, ?)`,
    [id, orgId, params.name, now, now],
  );

  // accounts
  await executeWrite(
    `INSERT INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, 'GROUP', ?, ?, 'XOF', 'ACTIVE', null, null, null, ?, ?)`,
    [id, orgId, id, params.name, now, now],
  );

  // caisses
  await executeWrite(
    `INSERT INTO caisses (id, name, description, type, color, org_id, status, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, 'GROUP', '#FF6B00', ?, 'ACTIVE', null, null, null, ?, ?)`,
    [id, params.name, params.description ?? "", orgId, now, now],
  );

  return id;
}

/**
 * Update a group (org_unit, caisse, group, account) via PowerSync.
 * Mirrors applyUpdateGroup from group-lifecycle: a group spans four rows
 * sharing the same id.
 */
export async function updateGroupPS(
  id: string,
  data: { name?: string; description?: string; type?: string },
): Promise<void> {
  const now = new Date().toISOString();

  // org_units
  await executeWrite(
    `UPDATE org_units SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
    [data.name ?? "", data.description ?? "", now, id],
  );

  // caisses
  await executeWrite(
    `UPDATE caisses SET name = ?, description = ?, updated_at = ? WHERE id = ?`,
    [data.name ?? "", data.description ?? "", now, id],
  );

  // groups
  await executeWrite(
    `UPDATE groups SET name = ?, updated_at = ? WHERE id = ?`,
    [data.name ?? "", now, id],
  );

  // accounts
  await executeWrite(
    `UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?`,
    [data.name ?? "", now, id],
  );
}

/**
 * Delete a group (and its memberships/caisse/account) via PowerSync.
 * Mirrors applyDeleteGroup from group-lifecycle.
 */
export async function deleteGroupPS(id: string): Promise<void> {
  // Memberships first (reference group_id)
  await executeWrite(`DELETE FROM group_memberships WHERE group_id = ?`, [id]);
  // Then the four entity rows
  await executeWrite(`DELETE FROM caisses WHERE id = ?`, [id]);
  await executeWrite(`DELETE FROM accounts WHERE id = ?`, [id]);
  await executeWrite(`DELETE FROM groups WHERE id = ?`, [id]);
  await executeWrite(`DELETE FROM org_units WHERE id = ?`, [id]);
}

export async function updateFormSubmissionPS(
  id: string,
  data: Partial<FormSubmission>,
): Promise<FormSubmission | null> {
  const existing = await getFormSubmissionPS(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  const setClauses: string[] = [];
  const params: any[] = [];
  if (data.orgId !== undefined) {
    setClauses.push("org_id = ?");
    params.push(data.orgId);
  }
  if (data.formDefinitionId !== undefined) {
    setClauses.push("form_definition_id = ?");
    params.push(data.formDefinitionId);
  }
  if (data.formVersion !== undefined) {
    setClauses.push("form_version = ?");
    params.push(data.formVersion);
  }
  if (data.linkedEntityType !== undefined) {
    setClauses.push("entity_type = ?");
    params.push(data.linkedEntityType);
  }
  if (data.linkedEntityId !== undefined) {
    setClauses.push("entity_id = ?");
    params.push(data.linkedEntityId);
  }
  if (data.data !== undefined) {
    setClauses.push("data = ?");
    params.push(JSON.stringify(data.data));
  }
  if (data.status !== undefined) {
    setClauses.push("status = ?");
    params.push(data.status);
  }
  await executeWrite(
    `UPDATE form_submissions SET ${setClauses.join(", ")} WHERE id = ?`,
    params,
  );
  return merged;
}

// ============================================================
// Re-export business services for page migration
// These wrap the existing service functions with PowerSync
// ============================================================

export { createVersement } from "./versement-service";
export { createNotification, markNotificationRead, markAllNotificationsRead } from "./notification-service";
export {
  buildAddTransaction,
  persistAddTransaction,
  auditAddTransaction,
  validateUpdateTransaction,
  applyUpdateTransaction,
  validateDeleteTransaction,
  applyDeleteTransaction,
  validateBatchDeleteTransactions,
  buildApproveTransaction,
  buildBatchApproveTransactions,
  buildReverseTransaction,
  persistReverseTransaction,
} from "./transaction-service";
export {
  buildAddEvent,
  persistAddEvent,
  applyUpdateEvent,
  persistUpdateEvent,
  applyDeleteEvent,
  persistDeleteEvent,
  applyUpdateEventStatus,
  addBudgetItem,
  removeBudgetItem,
  updateShoppingItemStatus,
} from "./event-service";
export {
  buildCreateMember,
  persistCreateMember,
  applyUpdateMember,
  persistUpdateMember,
  applyDeleteMember,
} from "./member-service";
export { createGroup } from "./group-service";
export {
  applyUpdateGroup,
  applyDeleteGroup,
  applyArchiveGroup,
  applyRestoreGroup,
  buildCreateEventBudget,
  buildAddBudgetLine,
  applyRemoveBudgetLine,
} from "./group-lifecycle";
export {
  createCulte,
  persistCulte,
  markCotisationPaid,
  persistMarkCotisationPaid,
  markCotisationsAbsent,
  persistMarkCotisationsAbsent,
  updateCotisation as updateCotisationService,
  persistUpdateCotisation,
  getCotisationsForCulte as getCotisationsForCulteSvc,
  getMembreHistorique as getMembreHistoriqueSvc,
  getMembresEnAvance as getMembresEnAvanceSvc,
} from "./cotisation-service";

// ============================================================
// Additional write operations for remaining pages
// ============================================================

/**
 * Approve a transaction via PowerSync
 */
export async function approveTransactionPS(
  id: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await executeWrite(
    `UPDATE transactions SET status = 'APPROVED', approved_by_id = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
    [userId, now, now, id],
  );
}

/**
 * Reverse a transaction via PowerSync
 */
export async function reverseTransactionPS(
  id: string,
  userId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();
  const reversalId = crypto.randomUUID();
  
  // Get original transaction
  const db = getPowerSyncDatabase();
  const result = await db.execute("SELECT * FROM transactions WHERE id = ?", [id]);
  const tx = result?.array?.[0] as any;
  if (!tx) throw new Error("Transaction not found");
  
  // Create reversal transaction
  await executeWrite(
    `INSERT INTO transactions (
      id, org_id, type, amount, description, date, status,
      category_id, org_unit_id, compensates_for, comment,
      version, created_by_id, approved_by_id, created_at,
      updated_at, approved_at, event_id, source, person_name,
      source_caisse_id, versement_id, reversal_of_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reversalId,
      tx.org_id,
      tx.type === "INCOME" ? "EXPENSE" : "INCOME",
      tx.amount,
      tx.description || "Réversal",
      now,
      "PENDING",
      tx.category_id,
      tx.org_unit_id,
      tx.id,
      reason,
      1,
      userId,
      null,
      now,
      now,
      null,
      tx.event_id,
      tx.source,
      tx.person_name,
      tx.source_caisse_id,
      tx.versement_id,
      id,
    ],
  );
}


// ============================================================
// App config and auth hooks
// ============================================================

/**
 * Hook to get app config from localStorage
 */
export function useAppConfig() {
  const [config, setConfig] = useState({
    churchName: "",
    churchLogoUrl: "",
    userPhoto: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("lumina-config");
    if (stored) {
      setConfig(JSON.parse(stored));
    }
  }, []);

  const updateConfig = async (newConfig: Partial<typeof config>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    localStorage.setItem("lumina-config", JSON.stringify(updated));
  };

  return { config, updateConfig };
}

/**
 * Hook to get current user from localStorage
 */
export function useCurrentUser() {
  const [user, setUser] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    org: { id: string; name: string; type: string; accentColor: string };
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lumina-user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  // Definitive fallback: if `lumina-user` is missing, build the shape from
  // the live `lumina-role` + `lumina-config` + church seed so the dashboard
  // header still renders instead of crashing on `user.role` over `null`.
  if (!user) {
    try {
      const role = localStorage.getItem("lumina-role") ?? "TREASURIER";
      const cfg = JSON.parse(
        localStorage.getItem("lumina-config") ?? "{}",
      );
      setUser({
        id: "local-user",
        email: "",
        firstName: "Utilisateur",
        lastName: "",
        role,
        org: {
          id: getOrganizationId(),
          name: cfg?.churchName || "Lumina",
          type: "Eglise",
          accentColor: "#FF6B00",
        },
      });
    } catch {
      /* storage unavailable (SSR / test) — stay null */
    }
  }

  return user;
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// ============================================================
// User and loading state hooks
// ============================================================

/**
 * Hook to load initial app data (config + cotisations) from localStorage/PowerSync.
 * Call once on app startup to prime the data layer.
 */
export interface LoadInitialDataResult {
  loaded: boolean;
  config: { churchName: string; churchLogoUrl: string; userPhoto: string };
  role: string | null;
}

export function useLoadInitialData(): LoadInitialDataResult {
  const [result, setResult] = useState<LoadInitialDataResult>({
    loaded: false,
    config: { churchName: "", churchLogoUrl: "", userPhoto: "" },
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const storedConfig = localStorage.getItem("lumina-config");
        const storedRole = localStorage.getItem("lumina-role");
        if (!cancelled) {
          setResult({
            loaded: true,
            config: storedConfig
              ? JSON.parse(storedConfig)
              : { churchName: "", churchLogoUrl: "", userPhoto: "" },
            role: storedRole,
          });
        }
      } catch {
        if (!cancelled) {
          setResult({
            loaded: true,
            config: { churchName: "", churchLogoUrl: "", userPhoto: "" },
            role: null,
          });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}

/**
 * Select a role and persist to localStorage.
 * Returns a fresh session ID.
 */
export async function selectRole(role: string): Promise<string> {
  const sessionId = localStorage.getItem("lumina-session") ?? crypto.randomUUID();
  localStorage.setItem("lumina-session", sessionId);
  localStorage.setItem("lumina-role", role);
  return sessionId;
}

/**
 * Hook to get current user
 */
