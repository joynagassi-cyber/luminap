const DB_NAME = 'lumina-db';
const DB_VERSION = 15;

export type StoreName = 'transactions' | 'categories' | 'orgUnits' | 'auditEntries' | 'events' | 'syncQueue' | 'config' | 'caisses' | 'notifications' | 'members' | 'groups' | 'accounts' | 'group_memberships' | 'form_definitions' | 'form_submissions' | 'custom_field_definitions' | 'custom_field_values' | 'versements' | 'event_budgets' | 'budget_lines' | 'report_definitions';

// Singleton DB connection — opened once, reused
let _db: IDBDatabase | null = null;
let _dbPromise: Promise<IDBDatabase> | null = null;
let _upgrading = false;

function ensureDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    // Close any existing connection first to unblock upgrades
    if (_db) {
      try { _db.close(); } catch {}
      _db = null;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      _upgrading = true;
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
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          db.createObjectStore(s.name, { keyPath: s.keyPath });
        }
      }
      // Create secondary indexes for performance
      try {
        const tx1 = db.transaction(['transactions'], 'readwrite');
        const txStore = tx1.objectStore('transactions');
        if (!txStore.indexNames.contains('source_caisse_id')) txStore.createIndex('source_caisse_id', 'sourceCaisseId', { unique: false });
        if (!txStore.indexNames.contains('versement_id')) txStore.createIndex('versement_id', 'versementId', { unique: false });
        if (!txStore.indexNames.contains('reversal_of_id')) txStore.createIndex('reversal_of_id', 'reversalOfId', { unique: false });
        tx1.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx2 = db.transaction(['caisses'], 'readwrite');
        const caissesStore = tx2.objectStore('caisses');
        if (!caissesStore.indexNames.contains('org_id')) caissesStore.createIndex('org_id', 'orgId', { unique: false });
        tx2.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx3 = db.transaction(['groups'], 'readwrite');
        const groupsStore = tx3.objectStore('groups');
        if (!groupsStore.indexNames.contains('org_id')) groupsStore.createIndex('org_id', 'orgId', { unique: false });
        if (!groupsStore.indexNames.contains('parent_group_id')) groupsStore.createIndex('parent_group_id', 'parentGroupId', { unique: false });
        tx3.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx4 = db.transaction(['accounts'], 'readwrite');
        const accountsStore = tx4.objectStore('accounts');
        if (!accountsStore.indexNames.contains('org_id')) accountsStore.createIndex('org_id', 'orgId', { unique: false });
        if (!accountsStore.indexNames.contains('owner_type_owner_id')) accountsStore.createIndex('owner_type_owner_id', ['ownerType', 'ownerId'], { unique: false });
        tx4.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx5 = db.transaction(['versements'], 'readwrite');
        const versementsStore = tx5.objectStore('versements');
        if (!versementsStore.indexNames.contains('org_id')) versementsStore.createIndex('org_id', 'orgId', { unique: false });
        if (!versementsStore.indexNames.contains('from_account_id')) versementsStore.createIndex('from_account_id', 'fromAccountId', { unique: false });
        if (!versementsStore.indexNames.contains('to_account_id')) versementsStore.createIndex('to_account_id', 'toAccountId', { unique: false });
        if (!versementsStore.indexNames.contains('status')) versementsStore.createIndex('status', 'status', { unique: false });
        tx5.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx6 = db.transaction(['members'], 'readwrite');
        const membersStore = tx6.objectStore('members');
        if (!membersStore.indexNames.contains('org_id')) membersStore.createIndex('org_id', 'orgId', { unique: false });
        tx6.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx7 = db.transaction(['budget_lines'], 'readwrite');
        const budgetLinesStore = tx7.objectStore('budget_lines');
        if (!budgetLinesStore.indexNames.contains('event_budget_id')) budgetLinesStore.createIndex('event_budget_id', 'eventBudgetId', { unique: false });
        if (!budgetLinesStore.indexNames.contains('category_id')) budgetLinesStore.createIndex('category_id', 'categoryId', { unique: false });
        tx7.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx8 = db.transaction(['group_memberships'], 'readwrite');
        const gmStore = tx8.objectStore('group_memberships');
        if (!gmStore.indexNames.contains('member_id')) gmStore.createIndex('member_id', 'memberId', { unique: false });
        if (!gmStore.indexNames.contains('group_id')) gmStore.createIndex('group_id', 'groupId', { unique: false });
        tx8.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx9 = db.transaction(['form_submissions'], 'readwrite');
        const fsStore = tx9.objectStore('form_submissions');
        if (!fsStore.indexNames.contains('form_definition_id')) fsStore.createIndex('form_definition_id', 'formDefinitionId', { unique: false });
        if (!fsStore.indexNames.contains('entity')) fsStore.createIndex('entity', ['linkedEntityType', 'linkedEntityId'], { unique: false });
        tx9.commit();
      } catch (e) { /* index may already exist */ }

      try {
        const tx10 = db.transaction(['custom_field_values'], 'readwrite');
        const cfvStore = tx10.objectStore('custom_field_values');
        if (!cfvStore.indexNames.contains('entity')) cfvStore.createIndex('entity', ['entityType', 'entityId'], { unique: false });
        tx10.commit();
      } catch (e) { /* index may already exist */ }
    };
    request.onsuccess = () => {
      _upgrading = false;
      const newDb = request.result;
      if (_db && _db !== newDb) {
        try { _db.close(); } catch {}
      }
      _db = newDb;
      _dbPromise = null;
      resolve(newDb);
    };
    request.onerror = () => {
      _upgrading = false;
      _dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      // Wait for old connections to close
    };
  });
  return _dbPromise;
}

// Verify all stores exist; if missing stores detected, delete the DB to force full recreation
async function ensureStores(db: IDBDatabase): Promise<void> {
  const expectedStores: StoreName[] = [
    'transactions', 'categories', 'orgUnits', 'auditEntries', 'events',
    'syncQueue', 'config', 'caisses', 'notifications', 'members', 'groups',
    'accounts', 'group_memberships', 'versements', 'event_budgets',
    'budget_lines', 'report_definitions', 'form_definitions', 'form_submissions',
    'custom_field_definitions', 'custom_field_values',
  ];
  const missing = expectedStores.filter(s => !db.objectStoreNames.contains(s));
  if (missing.length === 0) return;
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch {}
  _db?.close();
  _db = null;
  _dbPromise = null;
  _upgrading = false;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const newDb = (e.target as IDBOpenDBRequest).result;
      const stores: { name: StoreName; keyPath?: string }[] = expectedStores.map(name => ({ name, keyPath: 'id' }));
      for (const s of stores) {
        if (!newDb.objectStoreNames.contains(s.name)) {
          newDb.createObjectStore(s.name, { keyPath: s.keyPath });
        }
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      _dbPromise = null;
      resolve();
    };
    req.onerror = () => {
      _dbPromise = null;
      reject(req.error);
    };
  });
}

async function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest, retry = 0): Promise<T> {
  if (_upgrading) {
    await new Promise(r => setTimeout(r, 50));
    return withStore(storeName, mode, fn, retry);
  }
  const db = await ensureDB();

  // Check if the store exists; if not, try to fix the DB
  if (!db.objectStoreNames.contains(storeName)) {
    await ensureStores(db);
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
