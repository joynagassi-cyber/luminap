const DB_NAME = 'lumina-db';
const DB_VERSION = 16;

export type StoreName = 'transactions' | 'categories' | 'orgUnits' | 'auditEntries' | 'events' | 'syncQueue' | 'config' | 'caisses' | 'notifications' | 'members' | 'groups' | 'accounts' | 'group_memberships' | 'form_definitions' | 'form_submissions' | 'custom_field_definitions' | 'custom_field_values' | 'versements' | 'event_budgets' | 'budget_lines' | 'report_definitions';

// All stores that should exist
const ALL_STORES: StoreName[] = [
  'transactions', 'categories', 'orgUnits', 'auditEntries', 'events',
  'syncQueue', 'config', 'caisses', 'notifications', 'members', 'groups',
  'accounts', 'group_memberships', 'versements', 'event_budgets',
  'budget_lines', 'report_definitions', 'form_definitions', 'form_submissions',
  'custom_field_definitions', 'custom_field_values',
];

// Singleton DB connection
let _db: IDBDatabase | null = null;
let _dbPromise: Promise<IDBDatabase> | null = null;
let _upgrading = false;

function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      _upgrading = true;
      const db = (e.target as IDBOpenDBRequest).result;

      // Create all stores
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }

      // Create indexes
      const indexDefs: [string, string, string | string[]][] = [
        ['transactions', 'source_caisse_id', 'sourceCaisseId'],
        ['transactions', 'versement_id', 'versementId'],
        ['transactions', 'reversal_of_id', 'reversalOfId'],
        ['caisses', 'org_id', 'orgId'],
        ['groups', 'org_id', 'orgId'],
        ['groups', 'parent_group_id', 'parentGroupId'],
        ['accounts', 'org_id', 'orgId'],
        ['accounts', 'owner_type_owner_id', ['ownerType', 'ownerId']],
        ['versements', 'org_id', 'orgId'],
        ['versements', 'from_account_id', 'fromAccountId'],
        ['versements', 'to_account_id', 'toAccountId'],
        ['versements', 'status', 'status'],
        ['members', 'org_id', 'orgId'],
        ['budget_lines', 'event_budget_id', 'eventBudgetId'],
        ['budget_lines', 'category_id', 'categoryId'],
        ['group_memberships', 'member_id', 'memberId'],
        ['group_memberships', 'group_id', 'groupId'],
        ['form_submissions', 'form_definition_id', 'formDefinitionId'],
        ['form_submissions', 'entity', ['linkedEntityType', 'linkedEntityId']],
        ['custom_field_values', 'entity', ['entityType', 'entityId']],
      ];

      for (const [storeName, idxName, keyPath] of indexDefs) {
        try {
          const tx = db.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);
          if (!store.indexNames.contains(idxName)) {
            store.createIndex(idxName, keyPath);
          }
          tx.commit();
        } catch { /* index may already exist */ }
      }
    };

    request.onsuccess = () => {
      _upgrading = false;
      _db = request.result;
      _dbPromise = null;
      resolve(request.result);
    };

    request.onerror = () => {
      _upgrading = false;
      _dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      // Another tab holds the old version — wait and retry
      setTimeout(() => {
        if (_dbPromise) {
          _dbPromise.then(resolve).catch(reject);
        }
      }, 1000);
    };
  });
}

function ensureDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;

  _dbPromise = openDB();
  return _dbPromise;
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest, retry = 0): Promise<T> {
  if (_upgrading) {
    await new Promise(r => setTimeout(r, 50));
    return withStore(storeName, mode, fn, retry);
  }
  const db = await ensureDB();

  // If a store is missing, the DB schema is out of sync — recreate it
  if (!db.objectStoreNames.contains(storeName)) {
    try { indexedDB.deleteDatabase(DB_NAME); } catch {}
    _db?.close();
    _db = null;
    _dbPromise = null;
    _upgrading = false;
    await new Promise(r => setTimeout(r, 100));
    await ensureDB();
    return withStore(storeName, mode, fn, retry + 1);
  }

  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, mode);
    } catch (err) {
      if (retry >= 2) {
        reject(new Error(`[db] store "${storeName}" not found after ${retry + 1} attempts`));
        return;
      }
      _db?.close();
      _db = null;
      _dbPromise = null;
      _upgrading = false;
      withStore(storeName, mode, fn, retry + 1)
        .then(resolve)
        .catch(reject);
      return;
    }
    const store = tx.objectStore(storeName);
    const request = fn(store);
    tx.oncomplete = () => resolve(request.result as T);
    tx.onerror = () => reject(tx.error);
  });
}

// Pre-warm the DB connection with a timeout
async function warmDB(): Promise<void> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('DB warm-up timeout')), 5000)
  );
  try {
    await Promise.race([ensureDB(), timeout]);
  } catch {
    // will retry on demand
  }
}

export const db = {
  warmDB,
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
