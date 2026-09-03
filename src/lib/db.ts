/**
 * IndexedDB wrapper for Lumina
 * Data persists across crashes, reloads, and sessions
 */

const DB_NAME = 'lumina-db';
const DB_VERSION = 6;

// ─── Types ─────────────────────────────────────────────

export type Role = 'PASTEUR' | 'SECRETAIRE' | 'TREASURIER' | 'COMPTABLE' | 'TREASURIER_ADJOINT' | 'SECRETAIRE_ADJOINT';

export type FundSource = 'CAISSE' | 'COTISATION' | 'PERSONNE' | 'AUTRE';
export type EventStatus = 'PLANIFIED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

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
  eventId: string | null;
  source: FundSource | null;
  personName: string | null;
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
  description: string;
  orgId: string;
  isActive: boolean;
  syncStatus: 'pending' | 'synced';
}

export interface IndexedEvent {
  id: string;
  orgId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  status: EventStatus;
  budget: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced';
  cloudId?: string;
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

export interface IndexedNotification {
  id: string;
  orgId: string;
  actionType: string;
  title: string;
  message: string;
  isRead: boolean;
  sourceTransactionId: string | null;
  createdAt: string;
}

export interface IndexedRoleAssignment {
  sessionId: string;
  role: Role;
  orgId: string;
  createdAt: string;
}

export interface OrgConfig {
  key: string;
  value: unknown;
}

export interface SyncQueueEntry {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: 'transactions' | 'categories' | 'org_units' | 'audit_entries' | 'events';
  payload: unknown;
  attempt: number;
  lastAttemptAt: string;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────

export const ALL_ROLES: { key: Role; label: string; icon: string }[] = [
  { key: 'PASTEUR', label: 'Pasteur', icon: '✝' },
  { key: 'SECRETAIRE', label: 'Secrétaire', icon: '📝' },
  { key: 'TREASURIER', label: 'Trésorier', icon: '💰' },
  { key: 'COMPTABLE', label: 'Comptable', icon: '📊' },
  { key: 'TREASURIER_ADJOINT', label: 'Trésorier Adjoint', icon: '🔢' },
  { key: 'SECRETAIRE_ADJOINT', label: 'Secrétaire Adjoint', icon: '📋' },
];

// ─── Async cleanup after version upgrade ─────────────────────────

async function runCleanup(db: IDBDatabase): Promise<void> {
  const stores = ['transactions', 'categories', 'orgUnits', 'auditEntries', 'syncQueue', 'notifications', 'roleAssignments', 'events'];
  for (const storeName of stores) {
    if (db.objectStoreNames.contains(storeName)) {
      try {
        db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
      } catch (_) { /* ignore */ }
    }
  }
  if (db.objectStoreNames.contains('config')) {
    try {
      const tx = db.transaction('config', 'readwrite');
      const store = tx.objectStore('config');
      const req = store.getAllKeys();
      await new Promise<void>((resolve) => {
        req.onsuccess = () => {
          const keepKeys = new Set(['sessionId', 'selectedRole', 'lastSyncedAt']);
          const allKeys = req.result as string[];
          for (const key of allKeys) {
            if (!keepKeys.has(key)) store.delete(key);
          }
          resolve();
        };
        req.onerror = () => resolve();
      });
    } catch (_) { /* ignore */ }
  }
  console.log('[db] cleanup after version upgrade complete');
}

// ─── Database access ────────────────────────────────────

let dbReady: Promise<IDBDatabase> | null = null;
let dbOpenInProgress = false;

function ensureDBReady(): Promise<IDBDatabase> {
  if (dbReady) return dbReady;
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
      // Run async cleanup after upgrade if needed
      const dbConn = request.result;
      if ((dbConn as any).__needsDataCleanup) {
        delete (dbConn as any).__needsDataCleanup;
        runCleanup(dbConn);
      }
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

      // Notifications store (v4)
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }

      // Role assignments store (v4)
      if (!db.objectStoreNames.contains('roleAssignments')) {
        db.createObjectStore('roleAssignments', { keyPath: 'sessionId' });
      }

      // Events store (v5)
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }

      // Mark that we need to clear stale data after upgrade completes
      if (oldVersion < 6) {
        (db as any).__needsDataCleanup = true;
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

    dbReady = null;
    dbOpenInProgress = false;
    await new Promise(r => setTimeout(r, 100));
    const db = await ensureDBReady();
    return fn(db);
  }
}

// ─── Transactions ─────────────────────────────────────────

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

// ─── Categories ──────────────────────────────────────────

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

// ─── Org Units ───────────────────────────────────────────

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

export async function deleteOrgUnit(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('orgUnits', 'readwrite');
      const store = transaction.objectStore('orgUnits');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ─── Audit ───────────────────────────────────────────────

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

// ─── Notifications (local) ───────────────────────────────

export async function getAllNotifications(): Promise<IndexedNotification[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readonly');
      const store = tx.objectStore('notifications');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as IndexedNotification[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putNotification(n: IndexedNotification): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const req = store.put(n);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const entry = getReq.result as IndexedNotification | undefined;
        if (entry) {
          const updated = { ...entry, isRead: true };
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

export async function markAllNotificationsRead(): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const req = store.getAll();
      req.onsuccess = () => {
        const notifications = req.result as IndexedNotification[];
        let count = notifications.length;
        if (count === 0) { resolve(); return; }
        notifications.forEach(n => {
          store.put({ ...n, isRead: true }).onsuccess = () => {
            if (--count === 0) resolve();
          };
        });
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteNotificationsOlderThan(days: number): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      const range = IDBKeyRange.lowerBound(cutoff, true);
      const req = store.delete(range);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ─── Role Assignments (local) ────────────────────────────

export async function getRoleAssignment(sessionId: string): Promise<IndexedRoleAssignment | null> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roleAssignments', 'readonly');
      const store = tx.objectStore('roleAssignments');
      const req = store.get(sessionId);
      req.onsuccess = () => resolve(req.result as IndexedRoleAssignment | null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function putRoleAssignment(ra: IndexedRoleAssignment): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roleAssignments', 'readwrite');
      const store = tx.objectStore('roleAssignments');
      const req = store.put(ra);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllRoleAssignments(): Promise<IndexedRoleAssignment[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('roleAssignments', 'readonly');
      const store = tx.objectStore('roleAssignments');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as IndexedRoleAssignment[]);
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

// ─── Session / Cleanup ──────────────────────────────────

export async function getSessionId(): Promise<string> {
  let id = await getConfig<string>('sessionId');
  if (!id) {
    id = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await setConfig('sessionId', id);
  }
  return id;
}

export async function getRole(): Promise<Role | null> {
  const sessionId = await getSessionId();
  const ra = await getRoleAssignment(sessionId);
  return ra?.role ?? null;
}

export async function setRole(role: Role): Promise<void> {
  const sessionId = await getSessionId();
  await putRoleAssignment({ sessionId, role, orgId: 'org-1', createdAt: new Date().toISOString() });
  await setConfig('selectedRole', role);
}

export async function getAllRolesFromCloud(): Promise<Role[]> {
  // This will be populated by sync.ts
  return getConfig<Role[]>('assignedRoles') ?? [];
}

export async function setAllRolesFromCloud(roles: Role[]): Promise<void> {
  await setConfig('assignedRoles', roles);
}

// ─── Events ──────────────────────────────────────────────

export async function getAllEvents(): Promise<IndexedEvent[]> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as IndexedEvent[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getEvent(id: string): Promise<IndexedEvent | undefined> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as IndexedEvent | undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function putEvent(ev: IndexedEvent): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.put(ev);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function putEventBudget(id: string, budget: number): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.get(id);
      req.onsuccess = () => {
        const ev = req.result as IndexedEvent | undefined;
        if (ev) {
          store.put({ ...ev, budget, updatedAt: new Date().toISOString() });
          resolve();
        } else {
          reject(new Error('Event not found'));
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteEvent(id: string): Promise<void> {
  return withDB(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ─── Org Config (church name, logo) ──────────────────────

export async function getOrgConfig<T>(key: string): Promise<T | null> {
  return getConfig<T>(key);
}

export async function setOrgConfig(key: string, value: unknown): Promise<void> {
  await setConfig(key, value);
}
