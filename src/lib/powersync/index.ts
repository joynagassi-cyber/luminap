import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./SupabaseConnector";
import { supabase } from "@/lib/auth";

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

/**
 * Keep the PowerSync connector's Supabase client (B) in sync with the
 * app's main Supabase client (A, `supabase` from lib/auth.ts).
 *
 * BUG (auth bounce 2026-09-30): supabase-js GoTrueClient instances do not
 * share in-memory session state, even when they persist to the same
 * localStorage key. When the user signs in through client A, client B's
 * internal session stays `null`, so `fetchCredentials()` returns `null` →
 * the PowerSync service rejects the empty token → re-sync fails
 * indefinitely → the "session lost" symptom (Déconnecté on /splash,
 * bounce to /auth after login/signup) shows up.
 *
 * The storage key is not hardcoded: it is read from client A itself via
 * `(supabase.auth as any).storageKey`, which supabase-js derives from the
 * project URL at `createClient` time (verified live:
 * `sb-hhgovvrnalibhgpakswi-auth-token`). Both clients use the same URL
 * and the same default `auth.storageKey`, so they always share it.
 *
 * The fix is to mirror the session into client B whenever the app's
 * `onAuthStateChange` event fires (SIGNED_IN / SIGNED_OUT) by calling
 * `setSession` with the tokens persisted under that shared key.
 */
function mirrorAppSessionIntoConnector(): void {
  if (!_connector) return;

  const connectorClient = _connector.client;

  const syncFromStorage = () => {
    if (!_connector) return;
    try {
      // Read the shared storage key straight from client A — single source
      // of truth, no hardcoded project id.
      const storageKey = (supabase.auth as unknown as { storageKey?: string })
        .storageKey;
      if (!storageKey) return;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && parsed?.refresh_token) {
          // Client B only keeps the session in memory for the lifetime of
          // this tab; it does not own the refresh timer (client A owns it,
          // autoRefreshToken: true). Handing B a copy of the persisted
          // session is sufficient for `fetchCredentials` to return a valid
          // access_token.
          void connectorClient.auth
            .setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
            })
            .catch(() => {
              // setSession failure is non-fatal — B retries on next event.
            });
        }
      }
    } catch {
      // localStorage unavailable (SSR / pre-init) — no-op.
    }
  };

  supabase.auth.onAuthStateChange(() => {
    syncFromStorage();
  });
  // Synchronise on first boot, in case the session was persisted from a
  // previous app instance (the app client already called getSession() but
  // the connector client has no in-memory copy yet).
  syncFromStorage();
}

export async function initPowerSync(): Promise<void> {
  // Idempotent: a second call is a no-op so repeated boots / HMR do not
  // create a second database handle.
  if (_db) {
    return;
  }

  // Créer le connector
  _connector = new SupabaseConnector();

  // BUG FIX — mirror the app's main Supabase session into the connector's
  // own Supabase client so PowerSync's `fetchCredentials` returns a valid
  // token instead of `null` after every sign-in / sign-out.
  mirrorAppSessionIntoConnector();

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
