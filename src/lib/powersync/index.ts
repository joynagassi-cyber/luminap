import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./SupabaseConnector";

// Singleton instance
let _db: PowerSyncDatabase | null = null;
let _connector: SupabaseConnector | null = null;

export function getPowerSyncDatabase(): PowerSyncDatabase {
  if (!_db) {
    throw new Error(
      "[PowerSync] Database not initialized. Call initPowerSync() first.",
    );
  }
  return _db;
}

export function getPowerSyncConnector(): SupabaseConnector {
  if (!_connector) {
    throw new Error(
      "[PowerSync] Connector not initialized. Call initPowerSync() first.",
    );
  }
  return _connector;
}

export async function initPowerSync(): Promise<void> {
  // Idempotent: a second call is a no-op so repeated boots / HMR do not
  // create a second database handle.
  if (_db) {
    return;
  }

  // Créer le connector
  _connector = new SupabaseConnector();

  // Créer la base de données
  _db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: "lumina.db",
      debugMode: import.meta.env.DEV, // Activer le debug en développement
    },
  });

  // Connecter à PowerSync
  _db.connect(_connector);

  // Écouter les changements de statut
  _db.registerListener({
    statusChanged: (status) => {
      console.debug("[PowerSync] statusChanged:", {
        connected: status.connected,
        connecting: status.connecting,
        uploading: status.uploading,
        downloading: status.downloading,
        lastSyncedAt: status.lastSyncedAt,
        hasSynced: status.hasSynced,
        uploadError: status.uploadError?.message,
        downloadError: status.downloadError?.message,
      });
    },
  });

  // Kick off the first sync in the background. We deliberately do NOT await
  // it here: without an auth session (fresh browser, pre-login) the PowerSync
  // service will reject the empty token and `waitForFirstSync` could hang,
  // which would freeze the app boot. PowerSync retries automatically, and the
  // connector re-syncs as soon as a Supabase session exists (logged in in the
  // UI). initPowerSync resolves as soon as the database handle is ready.
  _db.waitForFirstSync().catch((error) => {
    console.debug("[PowerSync] first sync failed (will retry):", error);
  });
}

export async function disconnectPowerSync(): Promise<void> {
  if (_db) {
    await _db.disconnectAndClear();
    _db = null;
    _connector = null;
  }
}
