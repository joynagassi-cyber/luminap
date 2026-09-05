import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '@/lib/db';

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_RETRIES = 5;
let realtimeChannels: RealtimeChannel[] = [];
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

export async function enqueueSync(item: {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: any;
  attempts: number;
  lastAttempt: string | null;
  createdAt: string;
}): Promise<void> {
  if (!navigator.onLine) return;
  await db.enqueueSync(item);
}

export async function fetchFromCloud<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.warn('[sync] cloud fetch failed', e);
    return null;
  }
}

export async function syncWithBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (attempt >= MAX_RETRIES) {
      console.error('[sync] max retries exceeded', e);
      return null;
    }
    const delay = BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    await new Promise(r => setTimeout(r, delay));
    return syncWithBackoff(fn, attempt + 1);
  }
}

export async function startBackgroundSync() {
  if (syncIntervalId) return; // Already running

  async function syncCycle() {
    if (!navigator.onLine) return;
    try {
      const queue = await db.getSyncQueue();
      const pending = queue.filter(item => item.attempts < MAX_RETRIES);
      const maxAttempts = queue.filter(item => item.attempts >= MAX_RETRIES);
      const tooOld = queue.filter(item => item.createdAt && Date.now() - new Date(item.createdAt).getTime() > 24 * 60 * 60 * 1000);
      const toRemove = new Set([...maxAttempts, ...tooOld].map(i => i.id));
      for (const id of toRemove) {
        await db.removeSyncItem(id);
        console.log('[sync] cleaned up stuck sync item:', id);
      }

      for (const item of pending) {
        await syncWithBackoff(async () => {
          switch (item.entityType) {
            case 'transactions':
              if (item.operation === 'create') {
                await supabase.from('transactions').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('transactions').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('transactions').delete().eq('id', item.entityId);
              }
              break;
            case 'caisses':
              if (item.operation === 'create') {
                await supabase.from('caisses').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('caisses').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('caisses').delete().eq('id', item.entityId);
              }
              break;
            case 'orgUnits':
              if (item.operation === 'create') {
                await supabase.from('org_units').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('org_units').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('org_units').delete().eq('id', item.entityId);
              }
              break;
            case 'events':
              if (item.operation === 'create') {
                await supabase.from('events').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('events').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('events').delete().eq('id', item.entityId);
              }
              break;
            case 'notifications':
              if (item.operation === 'create') {
                await supabase.from('notifications').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('notifications').update(item.payload).eq('id', item.entityId);
              }
              break;
            case 'accounts':
              if (item.operation === 'create') {
                await supabase.from('accounts').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('accounts').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('accounts').delete().eq('id', item.entityId);
              }
              break;
            case 'groups':
              if (item.operation === 'create') {
                await supabase.from('groups').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('groups').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('groups').delete().eq('id', item.entityId);
              }
              break;
            case 'members':
              if (item.operation === 'create') {
                await supabase.from('members').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('members').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('members').delete().eq('id', item.entityId);
              }
              break;
            case 'groupMemberships':
              if (item.operation === 'create') {
                await supabase.from('group_memberships').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('group_memberships').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('group_memberships').delete().eq('id', item.entityId);
              }
              break;
            case 'versements':
              if (item.operation === 'create') {
                await supabase.from('versements').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('versements').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('versements').delete().eq('id', item.entityId);
              }
              break;
            case 'event_budgets':
              if (item.operation === 'create') {
                await supabase.from('event_budgets').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('event_budgets').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('event_budgets').delete().eq('id', item.entityId);
              }
              break;
            case 'budget_lines':
              if (item.operation === 'create') {
                await supabase.from('budget_lines').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('budget_lines').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('budget_lines').delete().eq('id', item.entityId);
              }
              break;
            case 'report_definitions':
              if (item.operation === 'create') {
                await supabase.from('report_definitions').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('report_definitions').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('report_definitions').delete().eq('id', item.entityId);
              }
              break;
            case 'form_definitions':
              if (item.operation === 'create') {
                await supabase.from('form_definitions').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('form_definitions').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('form_definitions').delete().eq('id', item.entityId);
              }
              break;
            case 'form_submissions':
              if (item.operation === 'create') {
                await supabase.from('form_submissions').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('form_submissions').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('form_submissions').delete().eq('id', item.entityId);
              }
              break;
            case 'custom_field_definitions':
              if (item.operation === 'create') {
                await supabase.from('custom_field_definitions').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('custom_field_definitions').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('custom_field_definitions').delete().eq('id', item.entityId);
              }
              break;
            case 'custom_field_values':
              if (item.operation === 'create') {
                await supabase.from('custom_field_values').insert(item.payload);
              } else if (item.operation === 'update') {
                await supabase.from('custom_field_values').update(item.payload).eq('id', item.entityId);
              } else if (item.operation === 'delete') {
                await supabase.from('custom_field_values').delete().eq('id', item.entityId);
              }
              break;
          }
          await db.removeSyncItem(item.id);
        });
      }
    } catch (e) {
      console.error('[sync] background sync cycle failed', e);
    }
  }

  // Run immediately then every 30 seconds
  await syncCycle();
  syncIntervalId = setInterval(syncCycle, 30000);
  console.log('[sync] background sync started');
}

export function stopBackgroundSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[sync] background sync stopped');
  }
}

export async function syncRoleAssignments() {
  // Fetch role assignments from local and sync to cloud
  const assignments = await db.getConfig<any>('roleAssignments');
  if (!assignments) return;
  // Sync each assignment
  for (const assignment of assignments) {
    await syncWithBackoff(async () => {
      await supabase.from('role_assignments').upsert(assignment);
    });
  }
}

export function startRealtimeSubscriptions() {
  if (!navigator.onLine) return;

  // Subscribe to transactions changes
  const sub1 = supabase
    .channel('transactions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' },
      async (payload) => {
        console.log('[sync] realtime transaction change:', payload);
        // Update local store
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const tx = payload.new as any;
          await db.put('transactions', tx);
        } else if (payload.eventType === 'DELETE') {
          const tx = payload.old as any;
          await db.delete('transactions', tx.id);
        }
      }
    )
    .subscribe();

  // Subscribe to audit entries changes
  const sub3 = supabase
    .channel('audit-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_entries' },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const audit = payload.new as any;
          await db.put('auditEntries', audit);
        } else if (payload.eventType === 'DELETE') {
          const audit = payload.old as any;
          await db.delete('auditEntries', audit.id);
        }
      }
    )
    .subscribe();

  // Subscribe to notifications changes
  const sub2 = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      async (payload) => {
        const notif = payload.new as any;
        // Avoid duplicates: check by source_transaction_id first, then by id
        const sourceTxId = notif.source_transaction_id;
        if (sourceTxId) {
          const existing = await db.getAll<any>('notifications');
          const duplicate = existing.find((n: any) => n.source_transaction_id === sourceTxId && n.action_type === notif.action_type && Math.abs(new Date(n.created_at).getTime() - new Date(notif.created_at).getTime()) < 60000);
          if (duplicate) return;
        }
        const existingById = await db.get('notifications', notif.id);
        if (!existingById) {
          await db.put('notifications', notif);
        }
      }
    )
    .subscribe();

  realtimeChannels.push(sub1, sub2, sub3);
  console.log('[sync] realtime subscriptions started');
}

export function stopRealtimeSubscriptions() {
  for (const sub of realtimeChannels) {
    supabase.removeChannel(sub);
  }
  realtimeChannels = [];
  console.log('[sync] realtime subscriptions stopped');
}

// Listen for online/offline events
export function setupNetworkListeners() {
  function handleOnline() {
    console.log('[sync] online — starting sync');
    startBackgroundSync();
    startRealtimeSubscriptions();
  }
  function handleOffline() {
    console.log('[sync] offline — stopping sync');
    stopBackgroundSync();
    stopRealtimeSubscriptions();
  }
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Also listen to visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      startBackgroundSync();
    }
  });
}
