const DB_NAME = 'lumina-db';
const DB_VERSION = 10;

export type StoreName = 'transactions' | 'categories' | 'orgUnits' | 'auditEntries' | 'events' | 'syncQueue' | 'config' | 'caisses' | 'notifications' | 'members' | 'groups' | 'accounts' | 'group_memberships' | 'form_definitions' | 'form_submissions' | 'custom_field_definitions' | 'custom_field_values' | 'versements' | 'event_budgets' | 'budget_lines' | 'report_definitions';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const stores: { name: StoreName; keyPath?: string }[] = [
        { name: 'transactions', keyPath: 'id' },
        { name: 'categories', keyPath: 'id' },
        { name: 'orgUnits', keyPath: 'id' },
        { name: 'auditEntries', keyPath: 'id' },
        { name: 'events', keyPath: 'id' },
        { name: 'syncQueue', keyPath: 'id' },
        { name: 'config', keyPath: 'key' },
        { name: 'caisses', keyPath: 'id' },
        { name: 'notifications', keyPath: 'id' },
        { name: 'members', keyPath: 'id' },
        { name: 'groups', keyPath: 'id' },
        { name: 'accounts', keyPath: 'id' },
        { name: 'group_memberships', keyPath: 'id' },
        { name: 'versements', keyPath: 'id' },
        { name: 'event_budgets', keyPath: 'id' },
        { name: 'budget_lines', keyPath: 'id' },
        { name: 'report_definitions', keyPath: 'id' },
        { name: 'form_definitions', keyPath: 'id' },
        { name: 'form_submissions', keyPath: 'id' },
        { name: 'custom_field_definitions', keyPath: 'id' },
        { name: 'custom_field_values', keyPath: 'id' },
      ];
      // Migrate events: add budget_items column if missing
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          db.createObjectStore(s.name, { keyPath: s.keyPath });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    tx.oncomplete = () => resolve(request.result as T);
    tx.onerror = () => reject(tx.error);
  });
}

export const db = {
  async get<T>(storeName: StoreName, id: string): Promise<T | null> {
    return withStore<T>(storeName, 'readonly', (s) => s.get(id));
  },
  async getAll<T>(storeName: StoreName): Promise<T[]> {
    return withStore<T[]>(storeName, 'readonly', (s) => s.getAll());
  },
  async put<T>(storeName: StoreName, data: T): Promise<void> {
    await withStore<void>(storeName, 'readwrite', (s) => s.put(data));
  },
  async delete(storeName: StoreName, id: string): Promise<void> {
    await withStore<void>(storeName, 'readwrite', (s) => s.delete(id));
  },
  async clear(storeName: StoreName): Promise<void> {
    await withStore<void>(storeName, 'readwrite', (s) => s.clear());
  },
  async getConfig<T>(key: string): Promise<T | null> {
    const item = await db.get<{ key: string; value: T }>('config', key);
    return item?.value ?? null;
  },
  async setConfig<T>(key: string, value: T): Promise<void> {
    await db.put('config', { key, value });
  },
  async getRoleAssignment(sessionId: string) {
    return db.get('config', `role_${sessionId}`);
  },
  async putRoleAssignment(assignment: { sessionId: string; role: string; orgId: string; createdAt: string }) {
    await db.put('config', { key: `role_${assignment.sessionId}`, value: assignment });
  },
  async setRole(role: string) {
    await db.setConfig('selectedRole', role);
  },
  async enqueueSync(item: {
    id: string;
    operation: 'create' | 'update' | 'delete';
    entityType: string;
    entityId: string;
    payload: any;
    attempts: number;
    lastAttempt: string | null;
    createdAt: string;
  }): Promise<void> {
    await db.put('syncQueue', item);
  },
  async getSyncQueue(): Promise<any[]> {
    return await db.getAll('syncQueue');
  },
  async removeSyncItem(id: string): Promise<void> {
    await db.delete('syncQueue', id);
  },
  async updateSyncAttempt(id: string, attempt: number): Promise<void> {
    const item = await db.get<any>('syncQueue', id);
    if (item) {
      await db.put('syncQueue', { ...item, attempts: attempt, lastAttempt: new Date().toISOString() });
    }
  },
};
