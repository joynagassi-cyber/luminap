/**
 * IndexedDB wrapper for Lumina
 * Data persists across crashes, reloads, and sessions
 */

const DB_NAME = 'lumina-db';
const DB_VERSION = 3;

// ─── Types ─────────────────────────────────────────────

export interface IndexedTransaction {
  id: string;
  orgId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  categoryId: string;
  orgUnitId: string | null;
  compensatesFor: string | null;
  comment: string | null;
  version: number;
  createdById: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  cloudId?: string;
}

export interface IndexedCategory {
  id: string;
  key: string;
  labelFr: string;
  type: 'INCOME' | 'EXPENSE';
  orgId: string;
  syncStatus: 'pending' | 'synced';
  isCustom?: boolean;
}

export interface IndexedOrgUnit {
  id: string;
  name: string;
  type: string;
  orgId: string;
  syncStatus: 'pending' | 'synced';
}

export interface IndexedAuditEntry {
  id: string;
  orgId: string;
  transactionId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  comment: string | null;
  createdAt: string;
}

export interface SyncQueueEntry {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: 'transactions' | 'categories' | 'org_units' | 'audit_entries';
  payload: unknown;
  attempt: number;
  lastAttemptAt: string;
  createdAt: string;
}

// ─── Database access ────────────────────────────────────

// Async mutex: guarantees only ONE indexedDB.open() runs at a time.
// Without this, two concurrent open() calls both trigger onupgradeneeded
// and race, causing "version change transaction is running".
let dbReady: Promise<IDBDatabase> | null = null;
let dbOpenInProgress = false;

function ensureDBReady(): Promise<IDBDatabase> {
  // Already connected — return cached connection
  if (dbReady) return dbReady;
  // Open already in progress — wait for it
  if (dbOpenInProgress) {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const check = () => {
        if (dbReady) {
          dbReady.then(resolve, reject);
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  // Start the open — only one indexedDB.open() at a time
  dbOpenInProgress = true;

  dbReady = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbReady = null;
      dbOpenInProgress = false;
      reject(request.error);
    };

    request.onsuccess = () => {
      dbReady = Promise.resolve(request.result);
      dbOpenInProgress = false;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // Transactions store
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      } else if (oldVersion < 3) {
        const store = db.transaction('categories', 'readwrite').objectStore('categories');
        store.createIndex('isCustom', 'isCustom', { unique: false });
      }

      // Org units store
      if (!db.objectStoreNames.contains('orgUnits')) {
        db.createObjectStore('orgUnits', { keyPath: 'id' });
      }

      // Audit entries store
      if (!db.objectStoreNames.contains('auditEntries')) {
        db.createObjectStore('auditEntries', { keyPath: 'id' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('table', 'table', { unique: false });
      }

      // Config store
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
    };
  });

  dbReady.catch(() => {
    dbReady = null;
    dbOpenInProgress = false;
  });

  return dbReady;
}

async function withDB<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await ensureDBReady();
    return fn(db);
  } catch (err) {
    const message = (err as Error).message ?? '';
    const isVersionError =
      message.includes('version change transaction is running') ||
      (err as DOMException)?.name === 'AbortError';
    if (!isVersionError) throw err;

    // Corrupted state — clear cache and retry once
    dbReady = null;
    dbOpenInProgress = false;
    await new Promise(r => setTimeout(r, 100));
    const db = await ensureDBReady();
    return fn(db);
  }
}

// ─── CRUD operations ────────────────────────────────────

export async function getAllTransactions(): Promise<IndexedTransaction[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getTransaction(id: string): Promise<IndexedTransaction | undefined> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putTransaction(tx: IndexedTransaction): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readwrite');
      const store = transaction.objectStore('transactions');
      const req = store.put(tx);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('transactions', 'readwrite');
      const store = transaction.objectStore('transactions');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllCategories(): Promise<IndexedCategory[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('categories', 'readonly');
      const store = tx.objectStore('categories');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putCategory(cat: IndexedCategory): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('categories', 'readwrite');
      const store = transaction.objectStore('categories');
      const req = store.put(cat);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('categories', 'readwrite');
      const store = transaction.objectStore('categories');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllOrgUnits(): Promise<IndexedOrgUnit[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('orgUnits', 'readonly');
      const store = tx.objectStore('orgUnits');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putOrgUnit(ou: IndexedOrgUnit): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('orgUnits', 'readwrite');
      const store = transaction.objectStore('orgUnits');
      const req = store.put(ou);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllAuditEntries(): Promise<IndexedAuditEntry[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('auditEntries', 'readonly');
      const store = tx.objectStore('auditEntries');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putAuditEntry(entry: IndexedAuditEntry): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('auditEntries', 'readwrite');
      const store = transaction.objectStore('auditEntries');
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ─── Sync queue ──────────────────────────────────────────

export async function enqueueSync(
  type: SyncQueueEntry['type'],
  table: SyncQueueEntry['table'],
  payload: unknown,
): Promise<void> {
  const entry: SyncQueueEntry = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    table,
    payload,
    attempt: 0,
    lastAttemptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getPendingSyncQueue(): Promise<SyncQueueEntry[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('createdAt');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result as SyncQueueEntry[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function removeSyncEntry(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function updateSyncEntry(id: string, updates: Partial<SyncQueueEntry>): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const entry = getReq.result as SyncQueueEntry;
        if (entry) {
          const updated = { ...entry, ...updates };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

// ─── Config ──────────────────────────────────────────────

export async function setConfig(key: string, value: unknown): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getConfig<T>(key: string): Promise<T | null> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as { value: T })?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  });
}
