import {
  BaseObserver,
  UpdateType,
  type CommonPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
} from "@powersync/web";

import { Session, SupabaseClient, createClient } from "@supabase/supabase-js";
import { AppSchema } from "./schema";
import { coerceJsonbColumns } from "@/lib/jsonb";

/**
 * Colonnes déclarées par le schéma PowerSync pour chaque table + la PK
 * `id` implicite. Utilisée par `pushCrudTransaction` pour filtrer les
 * ops offline qui portent des colonnes orphelines (historique du
 * schéma client, drift vs le schéma real) : un upsert `caisses.status`
 * après le retrait de `status` du schéma client échouerait avec
 * « Could not find the 'status' column of 'caisses' in the schema
 * cache » et boucherait toute la transaction. Le filtre garantit que
 * seuls les colonnes valides du schéma PowerSync sont poussées au
 * Supabase.
 */
export function buildSchemaColumns(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const table of AppSchema.tables) {
    // `table.columns` expose des instances `Column` (getter de
    // ResolvedTable → `options.columns`), pas des chaînes. Les étaler
    // directement produisait un Set de `"[object Object]"` : toutes les
    // colonnes sauf `id` étaient filtrées, chaque op partait en PUT avec
    // le seul `{id}` et Supabase la rejetait en 42501 (RLS
    // `is_org_member(uid, NULL)`), y compris après des heures de retry.
    out[table.name] = new Set(["id", ...table.columns.map((c) => c.name)]);
  }
  return out;
}

const SCHEMA_COLUMNS: Record<string, Set<string> | undefined> = buildSchemaColumns();

function filterOpDataToSchema(
  table: string,
  opData: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = SCHEMA_COLUMNS[table];
  if (!allowed) return opData; // table inconnue du schéma — on laisse passer
  const keys = Object.keys(opData);
  const dropped = keys.filter((k) => !allowed.has(k));
  if (dropped.length === 0) return opData;
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (allowed.has(k)) out[k] = opData[k];
  }
  return out;
}

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
};

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  new RegExp("^22...$"),
  // Class 23 — Integrity Constraint Violation.
  new RegExp("^23...$"),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp("^42501$"),
];

// ── DEFAULTS NOT NULL — 23502 avoidance ─────────────────────────────────
// Quand une op PUT arrive avec une valeur NULL sur une colonne NOT NULL
// (ex. `accounts.owner_type`, `org_units.name`, `audit_entries.action`),
// le POST Supabase échoue avec `23502` (not-null violation). La colonne
// en question est absente de l'opData (PowerSync n'envoie que les
// colonnes CHANGÉES depuis le dernier checkpoint local), donc
// `missingCols[]` apparaît vide alors que la valeur est NULL au niveau
// du PUT.
//
// Cette table fournit les valeurs par défaut canoniques pour chaque
// table PowerSync. Avant l'upsert, chaque clé NOT NULL absente de
// l'opData est remplie avec sa valeur par défaut si elle est listée ici.
// Les valeurs sont tirées du schéma local (dataLayer.createGroupPS) :
//   - accounts.owner_type : "GROUP"
//   - accounts.name       : "Unnamed" (fallback — name est NOT NULL)
//   - groups.status       : "ACTIVE"
//   - org_units.type      : "GROUP"
//   - audit_entries.action: "CREATE"
//   - audit_entries.entity_type: "Transaction"
//   - caisses.type        : "GROUP"
//   - custom_field_definitions.entity_type: "group"
//   - custom_field_definitions.field_label: ""
//   - custom_field_definitions.field_name:  ""
//   - custom_field_definitions.field_type:  "text"
//   - custom_field_definitions.order: 0
// `org_id` n'a JAMAIS de valeur par défaut : c'est la colonne d'isolation
// multi-tenant. Un défaut constant (`"org-e2e"`, org de test, présent ici
// jusqu'au 2026-10-22) réécrivait l'organisation réelle de chaque ligne
// (faille d'isolation, PATCH compris) ; un défaut `null` échouait de
// toute façon en 42501. Les insertions légitimes portent toujours
// `org_id` explicitement (cf. `addMemberPS`, `addEventPS`, …) : s'il
// manque, l'op doit échouer visiblement plutôt que d'écrire dans la
// mauvaise organisation.
export const NOT_NULL_DEFAULTS: Record<string, Record<string, unknown>> = {
  accounts: {
    owner_type: "GROUP",
    owner_id: "",
    name: "Unnamed",
    status: "ACTIVE",
    currency: "XOF",
  },
  groups: {
    status: "ACTIVE",
    name: "Unnamed",
  },
  org_units: {
    name: "Unnamed",
    type: "GROUP",
  },
  caisses: {
    name: "Unnamed",
    type: "GROUP",
  },
  audit_entries: {
    action: "CREATE",
    entity_type: "Transaction",
    entity_id: "",
  },
  custom_field_definitions: {
    entity_type: "group",
    field_name: "",
    field_label: "",
    field_type: "text",
    order: 0,
  },
};

/**
 * Pour chaque colonne NOT NULL de `table` (telle que déclarée dans
 * NOT_NULL_DEFAULTS), si `opData` ne contient pas la clé, on la remplit
 * avec la valeur par défaut. On ne touche JAMAIS aux clés présentes
 * (même si elles sont NULL explicitement — c'est au code appelant
 * de fournir une valeur, pas ici).
 */
function backfillNotNullDefaults(
  table: string,
  opData: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = NOT_NULL_DEFAULTS[table];
  if (!defaults) return opData;
  const out: Record<string, unknown> = { ...opData };
  for (const [col, val] of Object.entries(defaults)) {
    if (!(col in out) || out[col] === undefined || out[col] === null) {
      out[col] = val;
    }
  }
  return out;
}

// ── DIAG DEV-only : log chaque op d'upload (OK / FATAL) pour tracer
// en production pourquoi une op offline ne s'attend pas au Supabase
// dans le test Cypress (le `uploadData` est le seul chemin qui pousse
// les ops offline vers le cloud ; s'il échoue silencieusement, le
// spec ne voit rien et l'assertion REST reste à 0 ligne).
const DEV_LOG = import.meta.env.DEV;
function logOpOutcome(op: CrudEntry, ok: boolean, code?: string, msg?: string, orgId?: unknown) {
  if (!DEV_LOG) return;
  if (ok) {
    console.info(
      `[PowerSync] uploadData OK ${op.table} op=${op.op} org_id=${orgId ?? "(absent)"}`,
    );
  } else {
    console.warn(
      `[PowerSync] uploadData FAILED ${op.table} op=${op.op} org_id=${orgId ?? "(absent)"} code=${code ?? "?"} msg=${msg ?? "(unknown)"}`,
    );
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `transactions.created_by_id` / `approved_by_id` sont des `uuid` (FK →
 * auth.users) en PostgreSQL, mais les flux offline peuvent y écrire des
 * identifiants de session texte ("local-user", UUID de session locale…).
 * Bornière d'upload : toute valeur qui n'est pas un UUID valide est coercée
 * à `null` (colonnes nullable) — sinon chaque upload échouerait avec
 * « invalid input syntax for type uuid » et boucherait la file d'upload.
 */
function coerceUuidKeys(
  opData: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  let changed = false;
  const out = { ...opData };
  for (const key of keys) {
    const v = out[key];
    if (v !== undefined && v !== null && !UUID_RE.test(String(v))) {
      out[key] = null;
      changed = true;
    }
  }
  return changed ? out : opData;
}

/**
 * `transactions.created_by_id` / `approved_by_id` et
 * `documents.uploaded_by` sont des `uuid` (FK → auth.users / user id) en
 * PostgreSQL, mais les flux offline peuvent y écrire des identifiants de
 * session texte ("local-user", UUID de session locale…). Bornière d'upload :
 * toute valeur qui n'est pas un UUID valide est coercée à `null` (colonnes
 * nullable) — sinon chaque upload échouerait avec « invalid input syntax for
 * type uuid » et boucherait la file d'upload.
 */
function sanitizeTransactionsOpData(
  opData: Record<string, unknown>,
): Record<string, unknown> {
  return coerceUuidKeys(opData, ["created_by_id", "approved_by_id"]);
}

function sanitizeDocumentsOpData(
  opData: Record<string, unknown>,
): Record<string, unknown> {
  return coerceUuidKeys(opData, ["uploaded_by"]);
}

export type SupabaseConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: Session) => void;
};

export class SupabaseConnector
  extends BaseObserver<SupabaseConnectorListener>
  implements PowerSyncBackendConnector
{
  readonly client: SupabaseClient;
  readonly config: SupabaseConfig;

  ready: boolean;

  currentSession: Session | null;

  constructor() {
    super();
    // Fallbacks alignés avec le projet Supabase courant
    // (hhgovvrnalibhgpakswi) et l'instance PowerSync (voir docs/POWERSYNC_READY.md).
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !powersyncUrl || !supabaseAnonKey) {
      throw new Error(
        "[SupabaseConnector] VITE_SUPABASE_URL / VITE_POWERSYNC_URL / VITE_SUPABASE_ANON_KEY manquantes : la replication PowerSync ne peut pas fonctionner sans Supabase.",
      );
    }

    this.config = { supabaseUrl, powersyncUrl, supabaseAnonKey };

    // Client B (PowerSync) : session EN MÉMOIRE uniquement.
    //
    // `persistSession: false` + `autoRefreshToken: false` sont
    // indispensables : ce client partageait le storageKey de client A
    // (`sb-<ref>-auth-token`) tout en ayant son propre timer de refresh.
    // Supabase fait tourner (rotate) le refresh token à chaque refresh ;
    // les deux clients rafraîchissaient donc en parallèle avec le même
    // refresh token. Le second refresh était rejeté (« Invalid Refresh
    // Token: Already Used ») et Supabase RÉVOQUE toute la famille de
    // tokens → déconnexion aléatoire de l'utilisateur (et des specs
    // Cypress en cascade).
    //
    // A reste l'unique propriétaire de la session persistée et du timer
    // (voir src/lib/auth.ts) ; B ne fait que consommer une copie en
    // mémoire posée par `mirrorAppSessionIntoConnector()` pour que
    // `fetchCredentials()` renvoie un access_token valide.
    this.client = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    this.currentSession = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) {
      return;
    }

    const sessionResponse = await this.client.auth.getSession();
    this.updateSession(sessionResponse.data.session);

    this.ready = true;
    this.iterateListeners((cb) => cb.initialized?.());
  }

  async login(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    this.updateSession(data.session);
    return data.session;
  }

  async loginWithOTP(email: string) {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      throw error;
    }
  }

  async verifyOTP(email: string, token: string) {
    const { data, error } = await this.client.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      throw error;
    }

    this.updateSession(data.session);
    return data.session;
  }

  async loginWithGoogle() {
    const { Capacitor } = await import("@capacitor/core");
    const { isNativePlatform } = Capacitor;

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Native (Capacitor Android/iOS) : Google renvoie l'utilisateur
        // dans l'app via le scheme `lumina://` (intent-filter du
        // AndroidManifest.xml), pas dans le navigateur système.
        // Web : redirection vers l'URL du site.
        redirectTo: isNativePlatform()
          ? "lumina://auth/callback"
          : window.location.origin + "/auth/callback",
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async logout() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      // Sign-out failure is non-fatal; session is cleared regardless
    }
    this.updateSession(null);
  }

  async getSession() {
    const {
      data: { session },
    } = await this.client.auth.getSession();
    return session;
  }

  async fetchCredentials() {
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();

    if (!session || error) {
      // Pas de session : PowerSync reste en retry idle (aucun token vide,
      // qui ferait échouer le sync avec une 401 au gateway).
      return null;
    }

    return {
      endpoint: this.config.powersyncUrl,
      token: session.access_token ?? "",
      expiresAt: new Date(session.expires_at! * 1000),
    } satisfies PowerSyncCredentials;
  }

  /**
   * Re-mirror the app's main Supabase session (client A) into this
   * connector's own client (client B) right before every upload cycle.
   *
   * WHY: `uploadData` is invoked by PowerSync on a timer, but the two
   * supabase-js GoTrueClient instances do NOT share in-memory session
   * state — only the localStorage key does. After a reconnected offline
   * write lands (spec cloud-sync: offline → online toggle), the first
   * upload cycle may fire before `onAuthStateChange` has reached client
   * B, so `this.client.from(...)` would hit Supabase with a 401 (no
   * session). `ensureUploadSession` reads the shared localStorage key
   * once per upload cycle and only calls `setSession` when the
   * persisted token differs from B's in-memory copy.
   */
  private async ensureUploadSession(): Promise<void> {
    try {
      const storageKey =
        (this.client.auth as unknown as { storageKey?: string }).storageKey ??
        "";
      if (!storageKey) return; // No persisted storage key — nothing to mirror.
      const raw = localStorage.getItem(storageKey);
      if (!raw) return; // No persisted session yet — rely on onAuthStateChange.
      const parsed = JSON.parse(raw);
      if (!parsed?.access_token || !parsed?.refresh_token) return;

      // `getSession` is cheap (in-memory when present) — avoids a
      // setSession round-trip when the token already matches.
      const {
        data: { session: current },
      } = await this.client.auth.getSession();
      const currentTok = current?.access_token ?? "";
      if (currentTok !== parsed.access_token) {
        await this.client.auth
          .setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          })
          .catch((err) => {
            console.warn(
              "[PowerSync] ensureUploadSession setSession failed:",
              (err as Error)?.message ?? err,
            );
          });
      }
    } catch (err) {
      // localStorage / JSON edge case — fall through with whatever session B holds.
      console.debug("[PowerSync] ensureUploadSession read error:", err);
    }
  }

  /**
   * Pousse une transaction CRUD vers Supabase avec `complete()` final.
   *
   * Facteur partagé :
   *  - `uploadData` (cycle automatique du worker PowerSync)
   *  - `__psFlushCrudUpload` (flush déterministe pour les specs E2E —
   *    évite que le `cy.then` du spec time out si le worker est
   *    suspendu sous Electron headless)
   *
   * La transaction est passée en argument (et NON tirée via
   * `database.getNextCrudTransaction()` ici) : c'est à l'appelant de
   * décider quand et comment la tirer (avec ou sans timeout interne).
   */
  async pushCrudTransaction(
    transaction: { complete: () => Promise<void>; crud: CrudEntry[] },
  ): Promise<void> {
    if (!transaction || (transaction.crud || []).length === 0) {
      return;
    }

    // CRITICAL: before pushing any CRUD to Supabase, make sure client B
    // (this.client) has a live session. Without this, an upload that
    // fires immediately after a reconnect (offline-first scenario) can
    // hit Supabase with client B's in-memory session still `null` and
    // return 401 → the row silently stays in the offline queue.
    await this.ensureUploadSession();

    let lastOp: CrudEntry | null = null;
    // Compteurs de résultat réel : une op rejetée en FATAL est `continue`
    // (jetée) sans `throw`, donc le seul indicateur fiable est ce comptage.
    // Sans lui, `logOpOutcome(…, true, …)` annonce « OK » même quand TOUTES
    // les ops ont été jetées (cf. R89.c).
    let pushedOps = 0;
    let skippedOps = 0;
    // Dernier rejet FATAL observé (table/op/code/message) — exposé aux specs
    // E2E via `__psLastUpload` pour diagnostiquer une op jetée sans dépendre
    // de la console navigateur (invisible dans le stdout Cypress).
    let lastFatal: { table: string; op: string; code?: string; msg: string } | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        // Bornière uuid : les écritures offline peuvent porter des ids de
        // session texte dans created_by_id/approved_by_id — on les coercée à
        // null avant l'upload (colonnes uuid nullable côté PostgreSQL).
        // Bornière schéma : on filtre aussi les colonnes orphelines
        // (drift historique client vs schéma real, cf. caisses.status)
        // pour que l'upsert n'échoue pas sur « column not in schema
        // cache » et ne bloque pas toute la transaction d'upload.
        const opData =
          op.table === "transactions"
            ? filterOpDataToSchema(
                "transactions",
                sanitizeTransactionsOpData(op.opData as Record<string, unknown>),
              )
            : op.table === "documents"
              ? filterOpDataToSchema(
                  "documents",
                  sanitizeDocumentsOpData(op.opData as Record<string, unknown>),
                )
              : filterOpDataToSchema(
                  op.table,
                  coerceJsonbColumns(op.table, op.opData as Record<string, unknown>),
                );

        // Backfill des valeurs par défaut NOT NULL : si une colonne
        // NOT NULL du schéma Postgres est absente de l'opData (PowerSync
        // n'envoie que les colonnes CHANGÉES depuis le dernier checkpoint),
        // le PUT échouerait avec 23502. On la remplit avec la valeur
        // canonique (voir NOT_NULL_DEFAULTS) pour que la ligne soit
        // validée côté base.
        const safeOpData = backfillNotNullDefaults(op.table, opData);
        let result: any;
        if (DEV_LOG) {
          const winForLog = typeof window !== "undefined" ? window : null;
          console.info(
            `[PowerSync] pushCrudTransaction PUT ${op.table} id=${op.id} cols=${Object.keys(opData).join(",")}`,
          );
          winForLog?.console?.info?.(
            `[PowerSync] pushCrudTransaction PUT ${op.table} id=${op.id} cols=${Object.keys(opData).join(",")}`,
          );
        }

        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...safeOpData, id: op.id };
            // RLS « NO-USING » sur le INSERT (polcmd 'a') laisse passer
            // la ligne dans Supabase mais le RLS de la colonne `created_at`
            // peut rejeter 4xx. Le `onConflict: "id"` est la clé primaire
            // de PowerSync côté SQLite — pas de conflit en cas de double
            // upsert (ex. l'op est rejouée après un 4xx non-fatal).
            result = await table.upsert(record, { onConflict: "id" });
            break;
          }
          case UpdateType.PATCH:
            result = await table.update(safeOpData).eq("id", op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        // ── Success path : le Supabase client-js retourne `{ data, error }`.
        //    `upsert` SANS `.select()` a `data = null` et `error = undefined`
        //    sur un 2xx — c'est le cas normal de succès. On ne fait DONC
        //    JAMAIS de check sur `data` ici : seul `result.error` est
        //    significatif. Le `catch` du bloc `try/catch` suivant attrape
        //    les throws du Supabase client (401 RLS, 23502 not-null, …)
        //    qui ne sont PAS retournés dans `result.error` pour les 4xx
        //    supabase-js les renvoie quand même dans `.error`. On n'a
        //    qu'un seul chemin : `if (result.error) { … }`.
        if (result.error) {
          const errMsg = `Could not update Supabase: ${result.error.message}`;
          const winForLog = typeof window !== "undefined" ? window : null;
          const code: string | undefined = result.error.code ?? result.error.statusCode?.toString();
          const isFatal =
            typeof code === "string" && FATAL_RESPONSE_CODES.some((re) => re.test(code));

          // Ops FATAL (23502 not-null, 42501 RLS, 23xxx intègrité) :
          // On log, on DISCARD l'op (skip), on CONTINUE. Sans ça, le
          // throw interrompt la boucle avant `transaction.complete()`
          // et PowerSync considère que la tx n'a pas été poussée →
          // le `getNextCrudTransaction()` suivant retourne la même
          // tx → la queue est bloquée indéfiniment.
          //
          // Pour les erreurs 23502 (not-null violation), on logue le
          // détail des opData manquantes pour diagnostiquer l'origine.
          if (isFatal) {
            skippedOps++;
            lastFatal = { table: op.table, op: String(op.op), code, msg: errMsg };
            logOpOutcome(op, false, code, errMsg, op.opData?.org_id);
            if (DEV_LOG) {
              const missingCols = code?.startsWith("23502")
                ? Object.entries(opData)
                    .filter(([, v]) => v === null || v === undefined || v === "")
                    .map(([k]) => k)
                    .join(",")
                : "";
              winForLog?.console?.warn?.(
                `[PowerSync] pushCrudTransaction FATAL-SKIP ${op.table} id=${op.id} code=${code} missingCols=[${missingCols}]: ${errMsg}`,
              );
            }
            continue; // passe à l'op suivante
          }

          // Non-FATAL (401, 429, 5xx réseau, …) : on re-throw pour
          // que le cycle de retry PowerSync (worker auto + flush DEV)
          // retrye l'op.
          result.error.message = errMsg;
          throw result.error;
        }
        pushedOps++;
      }

      await transaction.complete(); // IMPORTANT!
      const winForLog = typeof window !== "undefined" ? window : null;
      if (skippedOps > 0) {
        // Ne PAS annoncer « OK » si des ops ont été jetées : le succès serait
        // mensonger (R89.c). On journalise un état dégradé explicite.
        logOpOutcome(
          lastOp,
          false,
          "PARTIAL",
          `${pushedOps} pushed, ${skippedOps} discarded`,
          lastOp?.opData?.org_id,
        );
      } else {
        logOpOutcome(lastOp, true, undefined, undefined, lastOp?.opData?.org_id);
      }
      if (DEV_LOG) {
        winForLog?.console?.info?.(
          `[PowerSync] pushCrudTransaction DONE: ${pushedOps} pushed, ${skippedOps} discarded`,
        );
      }
      // Exposé pour que le flush DEV (`__psFlushCrudUpload`) puisse rapporter
      // le résultat RÉEL (ops jetées incluses) au lieu d'un compteur qui
      // ignore les `continue` internes (cf. R89.c). Écrit sur TOUS les
      // chemins de sortie (succès comme échec) — un échec qui ne renseigne
      // pas ce champ rend le diagnostic impossible.
      if (winForLog) {
        (winForLog as any).__psLastUpload = { pushed: pushedOps, skipped: skippedOps, lastFatal, phase: "done" };
      }
    } catch (ex: any) {
      // `FATAL_RESPONSE_CODES` ne matche que sur `ex.code` (Postgres 5-char
      // SQLSTATE, ex. "23502"). Le Supabase client-js en revanche expose le
      // code HTTP sur `ex.code` (ex. "42501" ne s'y présente JAMAIS car
      // c'est un SQLSTATE Postgres pas un code HTTP ; mais les 4xx PostgREST
      // retournent un SQLSTATE `ex.code` 5-char ET un `ex.statusCode` HTTP
      // 3-digit). Sans `FATAL` ici, le `throw ex` du catch se propage dans
      // la boucle du flush, et `transaction.complete()` n'est JAMAIS appelé
      // → PowerSync considère la tx non poussée → le `getNextCrudTransaction`
      // suivant retoune la même tx à l'infini. C'est ce qui expliquait que
      // le run r76 pousse `accounts` mais JAMAIS `caisses` (la 1re op de la
      // tx, caisses, FAILED 23502 not-null → throw → skip of complete →
      // `groups`/`org_units` de la même tx non poussés → l'assertion REST
      // restait à 0 ligne). On traite le FATAL comme FATAL-SKIP : on log,
      // on DISCARD l'op (continue), on complete la tx pour que PowerSync
      // avance.
      const winForLog = typeof window !== "undefined" ? window : null;
      if (
        (typeof ex.code === "string" &&
          FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) ||
        (typeof ex.message === "string" &&
          FATAL_RESPONSE_CODES.some((re) => re.test(ex.message)))
      ) {
        /**
         * Errors that cannot be recovered from - discard the transaction
         */
        logOpOutcome(lastOp, false, ex.code, ex.message, lastOp?.opData?.org_id);
        await transaction.complete();
        if (winForLog) {
          (winForLog as any).__psLastUpload = {
            pushed: pushedOps, skipped: skippedOps, lastFatal, phase: "fatal-skip",
            error: { code: ex.code, message: ex.message },
          };
        }
      } else {
        // Error may be retryable - e.g. network error
        logOpOutcome(lastOp, false, ex.code ?? ex.code2 ?? "?", ex.message, lastOp?.opData?.org_id);
        winForLog?.console?.warn?.(
          `[PowerSync] pushCrudTransaction FAILED (retryable):`,
          ex?.message ?? ex,
        );
        if (winForLog) {
          (winForLog as any).__psLastUpload = {
            pushed: pushedOps, skipped: skippedOps, lastFatal, phase: "retryable-throw",
            error: { code: ex.code, message: ex.message },
          };
        }
        throw ex;
      }
    }
  }

  /**
   * Entrée point du cycle d'upload automatique PowerSync (worker WASM) :
   * tire la prochaine transaction + pousse via {@link pushCrudTransaction}.
   */
  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) {
      return;
    }
    await this.pushCrudTransaction(transaction);
  }

  updateSession(session: Session | null) {
    this.currentSession = session;
    if (!session) {
      return;
    }
    this.iterateListeners((cb) => cb.sessionStarted?.(session));
  }

  // Helper to get current user
  async getCurrentUser() {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user;
  }
}
