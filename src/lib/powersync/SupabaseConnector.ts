import {
  BaseObserver,
  UpdateType,
  type CommonPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
} from "@powersync/web";

import { Session, SupabaseClient, createClient } from "@supabase/supabase-js";

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

    this.client = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
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

  async uploadData(database: CommonPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        // Bornière uuid : les écritures offline peuvent porter des ids de
        // session texte dans created_by_id/approved_by_id — on les coercée à
        // null avant l'upload (colonnes uuid nullable côté PostgreSQL).
        const opData =
          op.table === "transactions"
            ? sanitizeTransactionsOpData(op.opData as Record<string, unknown>)
            : op.table === "documents"
              ? sanitizeDocumentsOpData(op.opData as Record<string, unknown>)
              : op.opData;
        let result: any;

        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...opData, id: op.id };
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH:
            result = await table.update(opData).eq("id", op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        if (result.error) {
          result.error.message = `Could not update Supabase: ${result.error.message}`;
          throw result.error;
        }
      }

      await transaction.complete(); // IMPORTANT!
    } catch (ex: any) {
      if (
        typeof ex.code === "string" &&
        FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))
      ) {
        /**
         * Errors that cannot be recovered from - discard the transaction
         */
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error
        throw ex;
      }
    }
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
