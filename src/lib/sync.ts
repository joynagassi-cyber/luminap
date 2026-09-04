import { supabase } from './client';

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_RETRIES = 5;

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

export async function startBackgroundSync(store: any) {
  if (!navigator.onLine) return;
  const queue = await store.getSyncQueue();
  for (const item of queue) {
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
          }
          break;
      }
      await store.removeSyncItem(item.id);
    });
  }
}

export async function syncRoleAssignments() {
  // Sync role assignments to cloud
}

export async function syncNotifications() {
  // Sync notifications to cloud
}

export function startRealtimeSubscriptions() {
  // Set up Supabase realtime subscriptions
}

export function stopRealtimeSubscriptions() {
  // Clean up realtime subscriptions
}

export function stopBackgroundSync() {
  // Stop background sync
}
