/**
 * Sync engine for Lumina
 * Handles background sync with retry queue and exponential backoff
 * Plus real-time notifications and role assignment sync
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import * as db from './db';
import type {
  SyncQueueEntry,
  IndexedTransaction,
  IndexedCategory,
  IndexedOrgUnit,
  IndexedEvent,
  IndexedAuditEntry,
  IndexedNotification,
  IndexedRoleAssignment,
  IndexedCaisse,
  Role,
} from './db';

// ─── Constants ─────────────────────────────────────────────────────────

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const SYNC_INTERVAL_MS = 30_000;

// ─── Sync status ───────────────────────────────────────────────────────

let syncStatus: 'idle' | 'syncing' | 'error' = 'idle';
let lastSyncedAt: string | null = null;
let listeners: Set<() => void> = new Set();

export function getSyncStatus() {
  return { syncStatus, lastSyncedAt };
}

export function onSyncStatusChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// ─── Supabase operations ───────────────────────────────────────────────

async function syncTransaction(tx: IndexedTransaction): Promise<void> {
  const data: Record<string, unknown> = {
    org_id: tx.orgId,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    status: tx.status,
    category_id: tx.categoryId,
    org_unit_id: tx.orgUnitId,
    event_id: tx.eventId,
    source: tx.source,
    person_name: tx.personName,
    compensates_for: tx.compensatesFor,
    comment: tx.comment,
    version: tx.version,
    created_by_id: tx.createdById,
    approved_by_id: tx.approvedById,
    approved_at: tx.approvedAt,
    created_at: tx.createdAt,
    updated_at: tx.updatedAt,
  };

  if (tx.syncStatus === 'pending' && !tx.cloudId) {
    // New transaction – insert
    const { data: inserted, error } = await supabase.from('transactions').insert(data).select().single();
    if (error) throw error;
    await db.putTransaction({ ...tx, cloudId: inserted?.id ?? tx.id, syncStatus: 'synced' });
  } else if (tx.cloudId) {
    // Existing transaction – update
    const { error } = await supabase
      .from('transactions')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        version: tx.version + 1,
      })
      .eq('id', tx.cloudId);
    if (error) throw error;
    await db.putTransaction({ ...tx, syncStatus: 'synced' });
  }
}

async function syncCategory(cat: IndexedCategory): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .upsert({
      id: cat.id,
      key: cat.key,
      label_fr: cat.labelFr,
      type: cat.type,
      org_id: cat.orgId,
      is_custom: cat.isCustom ?? false,
    });
  if (error) throw error;
  await db.putCategory({ ...cat, syncStatus: 'synced' });
}

async function syncCaisse(caiss: IndexedCaisse): Promise<void> {
  const { error } = await supabase
    .from('caisses')
    .upsert({
      id: caiss.id,
      name: caiss.name,
      description: caiss.description,
      type: caiss.type,
      color: caiss.color,
      org_id: caiss.orgId,
      created_at: caiss.createdAt,
      updated_at: caiss.updatedAt,
    });
  if (error) throw error;
  await db.putCaisse({ ...caiss, syncStatus: 'synced' });
}

async function syncEvent(ev: IndexedEvent): Promise<void> {
  const { error } = await supabase
    .from('events')
    .upsert({
      id: ev.id,
      name: ev.name,
      description: ev.description,
      start_date: ev.startDate,
      end_date: ev.endDate,
      status: ev.status,
      budget: ev.budget,
      created_at: ev.createdAt,
      updated_at: ev.updatedAt,
    });
  if (error) throw error;
  await db.putEvent({ ...ev, syncStatus: 'synced' });
}

async function syncOrgUnit(ou: IndexedOrgUnit): Promise<void> {
  const { error } = await supabase
    .from('org_units')
    .upsert({ id: ou.id, name: ou.name, type: ou.type, org_id: ou.orgId });
  if (error) throw error;
  await db.putOrgUnit({ ...ou, syncStatus: 'synced' });
}

async function syncAuditEntry(entry: IndexedAuditEntry): Promise<void> {
  const { error } = await supabase.from('audit_entries').insert({
    org_id: entry.orgId,
    transaction_id: entry.transactionId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    comment: entry.comment,
    created_at: entry.createdAt,
  });
  if (error) throw error;
}

// ─── Retry with exponential backoff ─────────────────────────────────────

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = BASE_DELAY_MS,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        const backoff = delayMs * Math.pow(2, attempt);
        console.warn(`[sync] retry ${attempt + 1}/${maxRetries} after ${backoff}ms`, err);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  throw lastError!;
}

// ─── Main sync loop ─────────────────────────────────────────────────────

async function processQueue(): Promise<void> {
  const queue = await db.getPendingSyncQueue();
  if (queue.length === 0) return;

  syncStatus = 'syncing';
  notifyListeners();

  for (const entry of queue) {
    try {
      await withRetry(async () => {
        switch (entry.table) {
          case 'transactions': {
            const tx = entry.payload as IndexedTransaction;
            await syncTransaction(tx);
            break;
          }
          case 'categories': {
            const cat = entry.payload as IndexedCategory;
            await syncCategory(cat);
            break;
          }
          case 'org_units': {
            const ou = entry.payload as IndexedOrgUnit;
            await syncOrgUnit(ou);
            break;
          }
          case 'audit_entries': {
            const ae = entry.payload as IndexedAuditEntry;
            await syncAuditEntry(ae);
            break;
          }
          case 'events': {
            const ev = entry.payload as IndexedEvent;
            await syncEvent(ev);
            break;
          }
          case 'caisses': {
            const caiss = entry.payload as IndexedCaisse;
            await syncCaisse(caiss);
            break;
          }
        }
      });

      await db.removeSyncEntry(entry.id);
    } catch (err) {
      console.error('[sync] failed to process queue entry', entry.id, err);
      await db.updateSyncEntry(entry.id, {
        attempt: entry.attempt + 1,
        lastAttemptAt: new Date().toISOString(),
      });
    }
  }

  syncStatus = 'idle';
  lastSyncedAt = new Date().toISOString();
  await db.setConfig('lastSyncedAt', lastSyncedAt);
  notifyListeners();
}

// ─── Notifications sync ────────────────────────────────────────────────

export async function syncNotifications(): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[sync] notifications fetch error', error);
      return;
    }

    const localNotifs = await db.getAllNotifications();
    const localIds = new Set(localNotifs.map(n => n.id));

    // Upsert remote notifications
    for (const n of (data ?? [])) {
      const local: IndexedNotification = {
        id: n.id,
        orgId: n.org_id,
        actionType: n.action_type,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        sourceTransactionId: n.source_transaction_id,
        createdAt: n.created_at,
      };
      if (!localIds.has(n.id)) {
        // New notification – store locally
        await db.putNotification(local);
      }
    }
  } catch (err) {
    console.error('[sync] notifications sync error', err);
  }
}

// ─── Role assignments sync ─────────────────────────────────────────────

export async function syncRoleAssignments(): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const { data, error } = await supabase
      .from('role_assignments')
      .select('role');

    if (error) {
      console.error('[sync] role_assignments fetch error', error);
      return;
    }

    const roles = (data ?? []).map(r => r.role as Role);
    await db.setAllRolesFromCloud(roles);
  } catch (err) {
    console.error('[sync] role_assignments sync error', err);
  }
}

// ─── Realtime subscription ─────────────────────────────────────────────

let notifSubscription: RealtimeChannel | null = null;
let roleSubscription: RealtimeChannel | null = null;

export function startRealtimeSubscriptions(): void {
  // Subscribe to new notifications
  notifSubscription = supabase
    .channel('notifications-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        console.log('[realtime] new notification', payload);
        const n = payload.new as any;
        const local: IndexedNotification = {
          id: n.id,
          orgId: n.org_id,
          actionType: n.action_type,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          sourceTransactionId: n.source_transaction_id,
          createdAt: n.created_at,
        };
        await db.putNotification(local);
        window.dispatchEvent(new CustomEvent('lumina:notification'));
      },
    )
    .subscribe();

  // Subscribe to role assignment changes
  roleSubscription = supabase
    .channel('role-assignments-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'role_assignments' },
      async () => {
        console.log('[realtime] role assignment changed');
        await syncRoleAssignments();
        window.dispatchEvent(new CustomEvent('lumina:roles-changed'));
      },
    )
    .subscribe();
}

export function stopRealtimeSubscriptions(): void {
  if (notifSubscription) {
    supabase.removeChannel(notifSubscription);
    notifSubscription = null;
  }
  if (roleSubscription) {
    supabase.removeChannel(roleSubscription);
    roleSubscription = null;
  }
}

// ─── Background sync interval ──────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync(): void {
  // Initial sync
  processQueue().catch(console.error);

  // Periodic queue processing
  syncInterval = setInterval(() => {
    processQueue().catch(console.error);
  }, SYNC_INTERVAL_MS);

  // Sync on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processQueue().catch(console.error);
      syncNotifications().catch(console.error);
    }
  });

  // Sync on network reconnect
  window.addEventListener('online', () => {
    console.log('[sync] network restored, syncing...');
    processQueue().catch(console.error);
    syncNotifications().catch(console.error);
  });
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ─── Fetch from Supabase (one-time load) ───────────────────────────────

export async function fetchFromCloud(): Promise<{
  transactions: IndexedTransaction[];
  categories: IndexedCategory[];
  orgUnits: IndexedOrgUnit[];
  events: IndexedEvent[];
  caisses: IndexedCaisse[];
  auditEntries: IndexedAuditEntry[];
}> {
  const [txRes, catRes, ouRes, eventRes, caissRes, auditRes] = await Promise.all([
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('id'),
    supabase.from('org_units').select('*').order('id'),
    supabase.from('events').select('*').order('created_at', { ascending: false }),
    supabase.from('caisses').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_entries').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  if (txRes.error) throw txRes.error;
  if (catRes.error) console.warn('[sync] categories fetch error', catRes.error);
  if (ouRes.error) console.warn('[sync] org_units fetch error', ouRes.error);
  if (eventRes.error) console.warn('[sync] events fetch error', eventRes.error);
  if (caissRes.error) console.warn('[sync] caisses fetch error', caissRes.error);
  if (auditRes.error) console.warn('[sync] audit fetch error', auditRes.error);

  return {
    transactions: (txRes.data ?? []).map(mapDbTx),
    categories: (catRes.data ?? []).map(mapDbCat),
    orgUnits: (ouRes.data ?? []).map(mapDbOu),
    events: (eventRes.data ?? []).map(mapDbEvent),
    caisses: (caissRes.data ?? []).map(mapDbCaisse),
    auditEntries: (auditRes.data ?? []).map(mapDbAudit),
  };
}

function mapDbTx(tx: any): IndexedTransaction {
  return {
    id: tx.id,
    orgId: tx.org_id,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    date: tx.date,
    status: tx.status,
    categoryId: tx.category_id,
    orgUnitId: tx.org_unit_id,
    eventId: tx.event_id ?? null,
    source: tx.source ?? null,
    personName: tx.person_name ?? null,
    compensatesFor: tx.compensates_for,
    comment: tx.comment,
    version: tx.version,
    sourceCaisseId: tx.source_caisse_id ?? null,
    versementId: tx.versement_id ?? null,
    createdById: tx.created_by_id ?? '',
    approvedById: tx.approved_by_id,
    approvedAt: tx.approved_at,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
    syncStatus: 'synced',
    cloudId: tx.id,
  };
}

function mapDbCaisse(c: any): IndexedCaisse {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    type: c.type,
    color: c.color ?? '#FF6B00',
    orgId: c.org_id,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    syncStatus: 'synced',
  };
}

function mapDbCat(cat: any): IndexedCategory {
  return {
    id: cat.id,
    key: cat.key,
    labelFr: cat.label_fr,
    type: cat.type,
    orgId: cat.org_id,
    syncStatus: 'synced',
    isCustom: cat.is_custom ?? false,
  };
}

function mapDbOu(ou: any): IndexedOrgUnit {
  return { id: ou.id, name: ou.name, type: ou.type, description: ou.description ?? '', orgId: ou.org_id, isActive: ou.is_active ?? true, syncStatus: 'synced' };
}

function mapDbEvent(ev: any): IndexedEvent {
  return {
    id: ev.id,
    orgId: ev.org_id,
    name: ev.name,
    description: ev.description ?? '',
    startDate: ev.start_date,
    endDate: ev.end_date,
    status: ev.status,
    budget: ev.budget,
    createdAt: ev.created_at,
    updatedAt: ev.updated_at,
    syncStatus: 'synced',
  };
}

function mapDbAudit(entry: any): IndexedAuditEntry {
  return {
    id: entry.id,
    orgId: entry.org_id,
    transactionId: entry.transaction_id,
    userId: entry.user_id,
    action: entry.action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    comment: entry.comment,
    createdAt: entry.created_at,
  };
}
