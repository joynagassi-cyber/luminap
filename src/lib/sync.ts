/**
 * Sync engine for Lumina
 * Handles background sync with retry queue and exponential backoff
 */
import { supabase } from '@/integrations/supabase/client';
import * as db from './db';
import type { SyncQueueEntry, IndexedTransaction, IndexedCategory, IndexedOrgUnit, IndexedAuditEntry } from './db';

// ─── Constants ─────────────────────────────────────────────────

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const SYNC_INTERVAL_MS = 30_000; // Check every 30s

// ─── Sync status ───────────────────────────────────────────────

let syncStatus: 'idle' | 'syncing' | 'error' = 'idle';
let lastSyncedAt: string | null = null;
let listeners: Set<() => void> = new Set();

export function getSyncStatus() {
  return { syncStatus, lastSyncedAt };
}

export function onSyncStatusChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// ─── Supabase operations ───────────────────────────────────────

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
    // New transaction - insert
    const { error } = await supabase.from('transactions').insert(data).select().single();
    if (error) throw error;
    // Update local with cloud ID
    const result = data as any;
    await db.putTransaction({ ...tx, cloudId: result.id, syncStatus: 'synced' });
  } else if (tx.cloudId) {
    // Existing transaction - update
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
    });
  if (error) throw error;
  await db.putCategory({ ...cat, syncStatus: 'synced' });
}

async function syncOrgUnit(ou: IndexedOrgUnit): Promise<void> {
  const { error } = await supabase
    .from('org_units')
    .upsert({
      id: ou.id,
      name: ou.name,
      type: ou.type,
      org_id: ou.orgId,
    });
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

// ─── Retry with exponential backoff ────────────────────────────

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

// ─── Main sync loop ────────────────────────────────────────────

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
        }
      });

      // Success - remove from queue
      await db.removeSyncEntry(entry.id);
    } catch (err) {
      console.error('[sync] failed to process queue entry', entry.id, err);
      // Update attempt count and schedule retry
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

// ─── Background sync interval ──────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync(): void {
  // Check queue immediately
  processQueue().catch(console.error);

  // Then check periodically
  syncInterval = setInterval(() => {
    processQueue().catch(console.error);
  }, SYNC_INTERVAL_MS);

  // Also sync on visibility change (user returns to app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processQueue().catch(console.error);
    }
  });

  // Sync on network reconnect
  window.addEventListener('online', () => {
    console.log('[sync] network restored, syncing...');
    processQueue().catch(console.error);
  });
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ─── Fetch from Supabase (one-time load) ──────────────────────

export async function fetchFromCloud(): Promise<{
  transactions: IndexedTransaction[];
  categories: IndexedCategory[];
  orgUnits: IndexedOrgUnit[];
  auditEntries: IndexedAuditEntry[];
}> {
  const [txRes, catRes, ouRes, auditRes] = await Promise.all([
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('id'),
    supabase.from('org_units').select('*').order('id'),
    supabase.from('audit_entries').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  if (txRes.error) throw txRes.error;
  if (catRes.error) console.warn('[sync] categories fetch error', catRes.error);
  if (ouRes.error) console.warn('[sync] org_units fetch error', ouRes.error);
  if (auditRes.error) console.warn('[sync] audit fetch error', auditRes.error);

  return {
    transactions: (txRes.data ?? []).map(mapDbTx),
    categories: (catRes.data ?? []).map(mapDbCat),
    orgUnits: (ouRes.data ?? []).map(mapDbOu),
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
    compensatesFor: tx.compensates_for,
    comment: tx.comment,
    version: tx.version,
    createdById: tx.created_by_id ?? '',
    approvedById: tx.approved_by_id,
    approvedAt: tx.approved_at,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
    syncStatus: 'synced',
    cloudId: tx.id,
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
  };
}

function mapDbOu(ou: any): IndexedOrgUnit {
  return { id: ou.id, name: ou.name, type: ou.type, orgId: ou.org_id, syncStatus: 'synced' };
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
