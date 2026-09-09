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
    this.config = {
      supabaseUrl:
        import.meta.env.VITE_SUPABASE_URL ||
        "https://vvcdmqpbwfyhkzalwdli.supabase.co",
      powersyncUrl:
        import.meta.env.VITE_POWERSYNC_URL ||
        "https://YOUR_INSTANCE_ID.powersync.journeyapps.com",
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
    };

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
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
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
      // Pour le développement, retourner un token vide si pas de session
      return {
        endpoint: this.config.powersyncUrl,
        token: "", // Token vide pour le dev
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } satisfies PowerSyncCredentials;
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
        let result: any;

        switch (op.op) {
          case UpdateType.PUT: {
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH:
            result = await table.update(op.opData).eq("id", op.id);
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
