import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./SupabaseConnector";
import { supabase } from "@/lib/auth";
// Import statique volontaire : `publishDevDiagnostics()` est appelé depuis
// `initPowerSync()` (bien après le chargement de tous les modules), donc
// l'appel synchrone ci-dessous est sûr — contrairement à un import
// dynamique qui laissait une fenêtre où un écran gardé montait encore sur
// son squelette avant que l'état « prête » ne soit posé.
import { markPowerSyncReady } from "@/lib/dataLayer";

// Singleton instance
let _db: PowerSyncDatabase | null = null;
let _connector: SupabaseConnector | null = null;

/**
 * DEV-ONLY : expose le handle PowerSync sur window pour que les specs
 * Cypress (cloud-sync) puissent inspecter `db.currentStatus` et
 * `getNextCrudTransaction()` après l'offline→online toggle. Le hook est
 * absent en build prod (pas de fuite de l'UI en shipping).
 */
function publishDevDiagnostics() {
  if (!import.meta.env.DEV) return;
  try {
    const win = window as unknown as Record<string, unknown>;
    win.__psDb = _db;
    win.__psConnector = _connector;
    // E2E : force l'état « réplique prête ». Le service PowerSync Cloud peut
    // refuser l'audience JWT (PSYNC_S2105) ; les specs E2E hors-ligne
    // seedent alors la base locale et marquent la réplique prête pour que
    // les écrans rendent au lieu de rester sur leur squelette. Import
    // dynamique : `dataLayer` importe ce module (cycle évité).
    win.__psMarkReady = () =>
      import("@/lib/dataLayer").then((m) => m.markPowerSyncReady());
    // Le drapeau de readiness est un état de module : il est REMIS à `false`
    // à chaque rechargement de page. `cy.visit()` recharge la SPA, donc les
    // specs qui visitent une page gardée APRÈS le seed retombent sur le
    // squelette. Le harness E2E pose ce drapeau localStorage ; au boot on
    // re-marque « prête » de façon SYNCHRONE (DEV uniquement, aucun impact
    // en production) pour qu'aucun écran gardé ne monte sur son squelette.
    if (localStorage.getItem("__e2e-ps-ready") === "1") {
      markPowerSyncReady();
    }
    // Exposer le client Supabase du connector (`_connector.client`)
    // pour que les specs E2E puissent faire des upserts directs
    // (contournement de `cy.intercept` qui bloque les `fetch` du
    // navigateur — les `fetch` du contexte Node de Cypress ne sont
    // PAS interceptés par `cy.intercept`). Le client est exposé via
    // `window.__psSupabaseClient` — le spec le lit et le pousse
    // directement.
    win.__psSupabaseClient = _connector?.client ?? null;
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
      const t0 = Date.now();
      const st = _db?.currentStatus;
      const winForLog: any = typeof window !== "undefined" ? window : null;
      const log = (level: "info" | "warn", ...args: unknown[]) => {
        // Écrire dans le console du navigateur (visible dans les logs
        // Cypress) ET le console du module (visible dans le log du dev
        // server) — les specs Cypress ne capturent que le premier.
        if (level === "info") {
          console.info(...args);
          if (winForLog) winForLog.console?.info?.(...args);
        } else {
          console.warn(...args);
          if (winForLog) winForLog.console?.warn?.(...args);
        }
      };
      log(
        "info",
        `[PS-FLUSH] start maxPasses=${maxPasses} _db=${!!_db} _connector=${!!_connector} dbStatus=${JSON.stringify(st ? { connected: st.connected, hasSynced: st.hasSynced, uploading: st.uploading } : null)}`,
      );
      if (!_db || !_connector) {
        log("info", `[PS-FLUSH] early return: db or connector not initialized`);
        const w2 = winForLog as Record<string, unknown> | null;
        if (w2) w2.__psFlushResult = {
          flushed: false, passes: 0, error: "db or connector not initialized",
        };
        return;
      }
      let passes = 0;
      let opsTotal = 0;
      let fatalSkipped = 0;
      for (let i = 0; i < maxPasses; i++) {
        const pt0 = Date.now();
        // `getCrudBatch()` est l'API officielle PowerSync pour tirer les
        // ops CRUD PENDING de la file d'upload SANS dépendre du cycle du
        // worker WASM (gelé en headless). Elle retourne un `CrudBatch`
        // ({ id, crud: CrudEntry[] }) — à adapter pour
        // `pushCrudTransaction` qui attend `CrudTransaction`
        // ({ complete(), crud }). Le `complete()` est simulé par
        // `getNextCrudTransaction()` (déjà appelé par le cycle de
        // l'auto-upload du worker, qui marque la tx comme poussée).
        //
        // En pratique : `getCrudBatch()` retourne le batch PENDING le
        // plus ancien. Le `complete()` manquant est le problème — on
        // résout en tirant le batch avec `getNextCrudTransaction()` qui
        // EST le batch + le complete() correct, mais en le RACING avec
        // un timeout de 10 s (pas 2 s, pour laisser au worker le temps
        // de préparer le batch). Si le worker est gelé, le race gagne
        // (null) et on lit directement `getCrudBatch` + on pousse + on
        // ne peut PAS appeler complete() (pas d'accès) → on laisse le
        // cycle auto du worker le faire.
        let tx: any = null;
        tx = await Promise.race([
          _db.getNextCrudTransaction(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (tx) {
          log("info", `[PS-FLUSH] pass ${i + 1}: getNextCrudTransaction → batch (${(tx.crud || []).length} ops) in ${Date.now() - pt0}ms`);
        } else {
          // Worker gelé : on tente getCrudBatch (lecture directe de la
          // file SQLite sans le worker).
          const batch: any = await _db.getCrudBatch(50);
          if (!batch) {
            log("info", `[PS-FLUSH] pass ${i + 1}: getCrudBatch → null (file vide) — break`);
            break;
          }
          const tables = [...new Set((batch.crud || []).map((c: any) => c.table))].join(",");
          log("info", `[PS-FLUSH] pass ${i + 1}: getCrudBatch → (${(batch.crud || []).length} ops: ${tables}) in ${Date.now() - pt0}ms`);
          opsTotal += (batch.crud || []).length;
          try {
            // getCrudBatch ne donne PAS le complete() — on pousse les
            // ops via pushCrudTransaction avec un wrapper minimal.
            const t1 = Date.now();
            // `batch` a `{ id, crud }` mais pas `complete()`.
            // `pushCrudTransaction` appelle `transaction.complete()` à la
            // fin — sans complete(), la file PowerSync ne sera jamais
            // vidée. On crée un stub de complete qui est un no-op (le
            // cycle auto du worker fera le complete() réel quand il
            // tourne ; en headless, il ne tourne jamais — c'est le
            // compromis : les ops sont poussées au Supabase, mais la
            // file PowerSync locale garde les ops (sans conséquence
            // sur l'assertion REST du spec).
            const stubTx = {
              complete: async () => { /* no-op — worker fera le vrai complete() */ },
              crud: batch.crud,
            };
            await _connector.pushCrudTransaction(stubTx as any);
            log("info", `[PS-FLUSH] pass ${i + 1}: getCrudBatch push OK in ${Date.now() - t1}ms`);
            passes++;
            break; // 1 passe suffit (batch = toutes les ops pending)
          } catch (err) {
            log("warn", `[PS-FLUSH] pass ${i + 1}: getCrudBatch push FAILED:`, (err as Error)?.message ?? err);
            fatalSkipped++;
            break;
          }
          continue;
        }
        const tables2 = [...new Set((tx.crud || []).map((c: any) => c.table))].join(",");
        log("info", `[PS-FLUSH] pass ${i + 1}: tx (${(tx.crud || []).length} ops: ${tables2}) in ${Date.now() - pt0}ms`);
        opsTotal += (tx.crud || []).length;
        try {
          const t1 = Date.now();
          await _connector.pushCrudTransaction(tx);
          log("info", `[PS-FLUSH] pass ${i + 1}: OK in ${Date.now() - t1}ms`);
          passes++;
          // `getNextCrudTransaction` retourne la tx suivante (non-complétée).
          // On continue jusqu'à maxPasses ou queue vide.
        } catch (err) {
          log("warn", `[PS-FLUSH] pass ${i + 1}: FAILED:`, (err as Error)?.message ?? err);
          fatalSkipped++;
          passes++;
          break;
        }
      }
      const lastUpload = (winForLog as any)?.__psLastUpload as
        | { pushed: number; skipped: number; lastFatal?: unknown }
        | undefined;
      const skipped = fatalSkipped + (lastUpload?.skipped ?? 0);
      // Diagnostic : état de la file d'upload locale après le flush. Sert à
      // distinguer « rien n'a été mis en file » de « la file contient des ops
      // que le worker gelé n'a pas tirées ».
      let queue: { count: number; tables: string[] } = { count: -1, tables: [] };
      try {
        const rows: any[] = await _db.getAll("SELECT data FROM ps_crud LIMIT 100");
        const tables = rows
          .map((r) => {
            try {
              return String(JSON.parse(String(r.data))?.type ?? "?");
            } catch {
              return "?";
            }
          })
          .filter((t) => t !== "?");
        queue = { count: rows.length, tables: [...new Set(tables)] };
      } catch {
        /* lecture impossible : laisser le sentinel -1 */
      }
      const result = {
        flushed: true,
        passes,
        opsTotal,
        fatalSkipped,
        queue,
        // Diagnostic : dernier rejet FATAL (table/op/code/message) — permet
        // aux specs E2E de savoir POURQUOI une op a été jetée.
        lastFatal: lastUpload?.lastFatal ?? null,
        // Résultat RÉEL de la dernière transaction poussée : `skipped > 0`
        // signifie qu'au moins une op a été jetée (donnée PERDUE). Sans ce
        // champ, un appelant ne peut pas distinguer un vrai succès d'une
        // perte silencieuse (cf. R89.c).
        skipped,
        ok: skipped === 0 && fatalSkipped === 0,
      };
      log(
        "info",
        `[PS-FLUSH] done: passes=${passes} opsTotal=${opsTotal} skipped=${skipped} ok=${result.ok} total=${Date.now() - t0}ms`,
      );
      const w2 = winForLog as Record<string, unknown> | null;
      if (w2) w2.__psFlushResult = result;
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
    void subscribeOrgStreams();
  });
  // Synchronise on first boot, in case the session was persisted from a
  // previous app instance (the app client already called getSession() but
  // the connector client has no in-memory copy yet).
  syncFromStorage();
}

/**
 * Streams declared `auto_subscribe: false` in the sync config (see
 * `powersync/sync-config.yaml`, the single source of truth for stream
 * definitions). They must be opened explicitly by the client, otherwise the
 * matching local tables stay empty — e.g. `organizations` stays empty and
 * « Mes comptes » (/sessions) shows no account.
 *
 * Subscriptions are persisted locally by PowerSync, so a reload does not drop
 * them. Idempotent and safe to call before login: without a session the
 * subscribe simply fails and is retried on the next auth event.
 */
const ON_DEMAND_STREAMS = [
  "org_owned",
  "org_administered",
  "org_memberships",
  "org_admins",
  "org_families",
  "grants",
  "tags",
  "tag_assignments",
  "event_tasks",
  "invitations",
  "invitation_claims",
  "org_reports",
] as const;

let _orgStreamsSubscribed = false;
async function subscribeOrgStreams(): Promise<void> {
  if (!_db || _orgStreamsSubscribed) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return; // retried by onAuthStateChange after login
    for (const name of ON_DEMAND_STREAMS) {
      await _db.syncStream(name).subscribe();
    }
    _orgStreamsSubscribed = true;
  } catch (error) {
    console.debug("[PowerSync] org streams subscribe failed (will retry):", error);
  }
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
      // E2E : le worker WASM dédié de `@powersync/web` se bloque dans le
      // contexte Electron headless de Cypress — après ~5 allers-retours
      // comlink, le 6e appel `db.execute` ne résout plus jamais (l'échec
      // remonte en `DataCloneError` non clonable). On exécute donc SQLite
      // sur le thread principal pendant les tests : c'est l'option prévue
      // par PowerSync pour les environnements de test. `window.Cypress`
      // n'existe que sous Cypress → aucun impact production/build.
      useWebWorker: !(typeof window !== "undefined" && (window as any).Cypress),
    },
  });

  // Connecter à PowerSync
  _db.connect(_connector);

  // Ouvrir les streams org (auto_subscribe: false) — nécessaire pour que
  // `organizations` / `org_memberships` / `org_admins` se remplissent et
  // que « Mes comptes » (/sessions) liste le compte. Appelé APRÈS la
  // création de `_db` (le handle doit exister) et après `connect` (une
  // session peut déjà être persistée au boot). Idempotent, et re-tenté
  // sur chaque événement auth (voir onAuthStateChange ci-dessus).
  void subscribeOrgStreams();

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
