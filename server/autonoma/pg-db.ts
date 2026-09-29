/**
 * Autonoma — client pg (Supabase) pour les factories.
 *
 * L'app est offline-first (PowerSync, placeholders `?`). Côté serveur
 * Nitro, on réutilise le même SQL en convertissant `?` → `$1…$n` (PG)
 * et en exécutant sur la base Supabase PG via `pg`.
 *
 * Connexion (par ordre de priorité) :
 *  1. `SUPABASE_DB_URL` — URL complète
 *     (`postgres://postgres:***@db.<ref>.supabase.co:5432/postgres?sslmode=require`),
 *  2. `PS_DB_HOST` + `PS_DB_USER` (défaut `postgres`) + `PS_DATABASE_PASSWORD`.
 *
 * Les secrets restent dans l'env (fourni par Autonoma sur la preview),
 * jamais commités.
 */
import pg from "pg";

const { Client } = pg;

type PooledClient = pg.Client;

let client: PooledClient | null = null;

function buildConfig(): pg.ClientConfig {
  const url = process.env.SUPABASE_DB_URL;
  if (url) {
    return {
      connectionString: url,
      application_name: "autonoma-integration",
    };
  }
  const host = process.env.PS_DB_HOST;
  const user = process.env.PS_DB_USER ?? "postgres";
  const password = process.env.PS_DATABASE_PASSWORD;
  if (!host) {
    throw new Error(
      "[autonoma] Base non joignable : fournir SUPABASE_DB_URL " +
        "(ou PS_DB_HOST + PS_DATABASE_PASSWORD) dans l'env.",
    );
  }
  return {
    host,
    port: Number(process.env.PS_DB_PORT ?? 5432),
    database: process.env.PS_DB_NAME ?? "postgres",
    user,
    password: password ?? "",
    ssl: { minVersion: "TLSv1.2" },
    application_name: "autonoma-integration",
  };
}

export async function autDb(): Promise<PooledClient> {
  if (client && !client.connection?.connected) {
    client = null;
  }
  if (!client) {
    const c = new Client({
      ...buildConfig(),
      connectTimeout: 15_000, // échoue vite si le pooler n'est pas joignable
      idleTimeoutMillis: 30_000,
      query_timeout: 120_000, // 120 s max par requête (up complet)
    });
    try {
      await c.connect();
      client = c;
    } catch (e) {
      throw new Error(
        `[autonoma] Connexion PG échouée : ${e instanceof Error ? e.message : String(e)}. ` +
          "Vérifier que SUPABASE_DB_URL (ou PS_DB_HOST + PS_DATABASE_PASSWORD) est configuré " +
          "et que le pooler Supabase autorise le connecteur de la preview (IP/allowlist).",
      );
    }
  }
  return client;
}

export async function closeAutDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}

function toPgSql(sql: string): string {
  // Le SQL PowerSync ne contient aucun `?` littéral : les `?` ne sont
  // que des placeholders positionnels.
  let i = 0;
  return sql.replace(/\?/g, () => (i += 1, `$${i}`));
}

/**
 * Équiv. PowerSync `execute(sql, params)` : `?` → `$n` (PG), renvoie
 * `{ array, rowsAffected }` (le shape attendu par le data layer).
 */
export async function pgExecute(
  sql: string,
  params: unknown[] = [],
): Promise<{ array: unknown[]; rowsAffected: number }> {
  const c = await autDb();
  const res = await c.query(toPgSql(sql), params);
  return {
    array: res.rows ?? [],
    rowsAffected: res.rowCount ?? 0,
  };
}

/** Équiv. PowerSync `execute` pour les lectures : renvoie les lignes. */
export async function pgQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const c = await autDb();
  const res = await c.query<T>(toPgSql(sql), params);
  return res.rows;
}
