import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./SupabaseConnector";
import { supabase } from "@/lib/auth";

// Singleton instance
let _db: PowerSyncDatabase | null = null;
let _connector: SupabaseConnector | null = null;

/**
 * DEV-ONLY : expose le handle PowerSync sur window pour que les specs
 * Cypress (cloud-sync) puissent inspecter `db.status` et
 * `getNextCrudTransaction()` après l'offline→online toggle. Le hook est
 * absent en build prod (pas de fuite de l'UI en shipping).
 */
function publishDevDiagnostics() {
  if (!import.meta.env.DEV) return;
  try {
    const win = window as unknown as Record<string, unknown>;
    win.__psDb = _db;
    win.__psConnector = _connector;
    // Flush déterministe pour les specs E2E (cloud-sync).
    //
    // Le worker WASM PowerSync (@powersync/web) est suspendu dans le
    // contexte Electron headless de Cypress : son cycle d'upload
    // (~30 s) ne tourne pas de façon fiable pendant le test, et
    // `db.getNextCrudTransaction()` — qui attend le prochain batch du
    // worker — ne résout jamais si le worker n'est pas réveillé.
    //
    // `flushCrudUpload` pousse directement la queue d'upload via le
    // client Supabase du connector (SupabaseConnector.uploadData),
    // sans dépendre du timer du worker :
    //   1. tire la prochaine transaction PowerSync (timeout interne
    //      5 s pour ne jamais bloquer le test),
    //   2. appelle `connector.uploadData(db)` qui ré-miroire la
    //      session A→B (`ensureUploadSession`) puis pousse chaque op
    //      au Supabase + complete la transaction,
    //   3. répète jusqu'à N passes (max) ou queue vide.
    //
    // DEV-only : l'appel est volontairement inactif en production
    // (pas de fuite de l'UI). Les specs Cypress reçoivent le handle
    // via `window.__psFlushCrudUpload`.
    win.__psFlushCrudUpload = async (maxPasses: number = 5) => {
      if (!_db || !_connector) return { flushed: false, passes: 0, error: "db or connector not initialized" };
      let passes = 0;
      let opsTotal = 0;
      for (let i = 0; i < maxPasses; i++) {
        const tx: any = await Promise.race([
          _db.getNextCrudTransaction(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (!tx) break; // queue vide, ou worker suspendu (timeout)
        opsTotal += (tx.crud || []).length;
        try {
          await _connector.uploadData(_db);
          passes++;
        } catch {
          // Une op FATAL (42501 RLS / 23xxx intègrité) peut re-throw
          // (replay DEV) : on continue sur la passe suivante au lieu
          // d'échouer tout le flush.
          passes++;
        }
      }
      return { flushed: true, passes, opsTotal };
    };
  } catch {
    /* SSR / worker boundary */
  }
}

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
  //
  // ORDER MATTERS : le miroir doit s'exécuter AVANT la création de la
  // `PowerSyncDatabase`. Raison : au boot, `supabase.auth.onAuthStateChange`
  // (souscrit par mirrorAppSessionIntoConnector → client B) n'émet
  // SIGNED_IN que si la session du client B n'est pas déjà posée. Le
  // client A (`supabase` de lib/auth) lit sa session depuis
  // localStorage (persistSession), mais le client B (`this.client` de
  // SupabaseConnector) a son propre client en mémoire — il ne lit PAS
  // le localStorage de A. Sans le miroir, B reste `session = null` au
  // premier boot et `fetchCredentials()` retourne null → PowerSync
  // refuse le sync avec un token vide → les uploads d'offline-first
  // (createGroupPS / custom fields) échouent silencieusement (4xx
  // encaissé dans la queue, pas retryé si le 4xx est « fatal »).
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

  // DEV-ONLY : expose le handle sur window pour les specs Cypress.
  publishDevDiagnostics();
}

export async function disconnectPowerSync(): Promise<void> {
  if (_db) {
    await _db.disconnectAndClear();
    _db = null;
    _connector = null;
  }
}
