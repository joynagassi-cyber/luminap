/**
 * Non-régression sur le write path PowerSync → Supabase.
 *
 * Deux défauts critiques trouvés le 2026-10-22, tous deux dans
 * `SupabaseConnector.ts`, faisaient échouer TOUTE écriture client :
 *
 *  1. `SCHEMA_COLUMNS` étalait `table.columns` (des instances `Column`)
 *     dans un `Set` → le Set ne contenait que `"id"` et
 *     `"[object Object]"`, donc `filterOpDataToSchema` supprimait
 *     `org_id` et toutes les autres colonnes. Le PUT partait avec
 *     `{id}` seul et Supabase répondait 42501 (RLS
 *     `is_org_member(uid, NULL)` = false).
 *
 *  2. `NOT_NULL_DEFAULTS` fournissait `org_id: "org-e2e"` (l'org de
 *     test) : une colonne `org_id` absente était réécrite vers une
 *     autre organisation — faille d'isolation multi-tenant.
 *
 * Ces tests lisent la vraie configuration du connecteur (schéma
 * PowerSync réel + table de défauts réelle), pas une copie.
 */
import { describe, it, expect } from "vitest";
import { AppSchema } from "../powersync/schema";
import { UpdateType } from "@powersync/web";
import { buildSchemaColumns, NOT_NULL_DEFAULTS } from "../powersync/SupabaseConnector";

describe("PowerSync connector — filtre de colonnes", () => {
  it("conserve toutes les colonnes déclarées du schéma (dont org_id)", () => {
    const schemaColumns = buildSchemaColumns();

    const members = schemaColumns.members;
    expect(members).toBeDefined();
    expect(members!.has("id")).toBe(true);
    expect(members!.has("org_id")).toBe(true);
    expect(members!.has("first_name")).toBe(true);
    expect(members!.has("last_name")).toBe(true);
  });

  it("ne contient aucun nom de colonne non-chaîne", () => {
    const schemaColumns = buildSchemaColumns();
    for (const [table, cols] of Object.entries(schemaColumns)) {
      for (const col of cols!) {
        expect(typeof col, `${table}.${col}`).toBe("string");
        expect(col).not.toContain("[object");
      }
    }
  });

  it("couvre chaque table du schéma avec la PK + ses colonnes", () => {
    const schemaColumns = buildSchemaColumns();
    for (const table of AppSchema.tables) {
      const cols = schemaColumns[table.name];
      expect(cols, `table ${table.name}`).toBeDefined();
      expect(cols!.size, `table ${table.name}`).toBe(table.columns.length + 1);
    }
  });
});

describe("PowerSync connector — défauts NOT NULL", () => {
  it("ne définit jamais org_id (colonne d'isolation multi-tenant)", () => {
    for (const [table, defaults] of Object.entries(NOT_NULL_DEFAULTS)) {
      expect(
        Object.keys(defaults),
        `table ${table} ne doit pas fournir org_id`,
      ).not.toContain("org_id");
    }
  });

  it("ne contient aucune valeur d'org de test codée en dur", () => {
    const serialized = JSON.stringify(NOT_NULL_DEFAULTS);
    expect(serialized).not.toContain("org-e2e");
    expect(serialized).not.toContain("org-1");
  });
});

/**
 * R89.c — non-régression : un upload dont TOUTES les ops sont jetées (FATAL
 * 23503/23502/42501) ne doit JAMAIS être journalisé comme un succès.
 *
 * Avant ce correctif, `pushCrudTransaction` appelait `logOpOutcome(…, true, …)`
 * à la fin de la boucle même quand chaque op avait été `continue`-ée : le log
 * affichait « uploadData OK » juste après un « FATAL-SKIP », et
 * `__psFlushResult.fatalSkipped` restait à 0. La perte de données était donc
 * invisible (c'est ce qui a masqué R89 pendant des mois).
 */
describe("PowerSync connector — R89.c, pas de faux succès d'upload", () => {
  it("journalise un état dégradé (pas « OK ») quand toutes les ops sont jetées", async () => {
    const { SupabaseConnector } = await import("../powersync/SupabaseConnector");

    const infos: string[] = [];
    const warns: string[] = [];
    const origInfo = console.info;
    const origWarn = console.warn;
    console.info = (...a: unknown[]) => { infos.push(a.map(String).join(" ")); };
    console.warn = (...a: unknown[]) => { warns.push(a.map(String).join(" ")); };

    try {
      const connector = new SupabaseConnector();
      // La FK `transactions_category_id_fkey` viole → 23503 = FATAL.
      (connector as unknown as { client: unknown }).client = {
        from: () => ({
          upsert: async () => ({
            error: {
              code: "23503",
              message:
                'insert or update on table "transactions" violates foreign key constraint "transactions_category_id_fkey"',
            },
          }),
        }),
      };
      // Pas de session persistée → ensureUploadSession ne fait rien.
      (connector as unknown as { ensureUploadSession: () => Promise<void> }).ensureUploadSession =
        async () => {};

      let completed = false;
      const tx = {
        crud: [
          {
            table: "transactions",
            op: UpdateType.PUT,
            id: "tx-r89c",
            opData: { org_id: "org-e2e", category_id: "cat-dime" },
          },
        ],
        complete: async () => { completed = true; },
      };

      await connector.pushCrudTransaction(tx as never);

      const okLines = infos.filter((l) => l.includes("uploadData OK"));
      expect(okLines, "aucun faux « uploadData OK » ne doit être émis").toHaveLength(0);
      expect(
        warns.some((l) => l.includes("FAILED") && l.includes("23503")),
        "le rejet doit être journalisé avec son code",
      ).toBe(true);
      expect(completed, "la transaction doit être complétée (file non bloquée)").toBe(true);
    } finally {
      console.info = origInfo;
      console.warn = origWarn;
    }
  });

  it("journalise « OK » quand l'op est réellement poussée", async () => {
    const { SupabaseConnector } = await import("../powersync/SupabaseConnector");
    const infos: string[] = [];
    const origInfo = console.info;
    console.info = (...a: unknown[]) => { infos.push(a.map(String).join(" ")); };
    try {
      const connector = new SupabaseConnector();
      (connector as unknown as { client: unknown }).client = {
        from: () => ({ upsert: async () => ({ error: null }) }),
      };
      (connector as unknown as { ensureUploadSession: () => Promise<void> }).ensureUploadSession =
        async () => {};
      const tx = {
        crud: [
          {
            table: "transactions",
            op: UpdateType.PUT,
            id: "tx-ok",
            opData: { org_id: "org-e2e", category_id: "cat-1" },
          },
        ],
        complete: async () => {},
      };
      await connector.pushCrudTransaction(tx as never);
      expect(infos.some((l) => l.includes("uploadData OK"))).toBe(true);
    } finally {
      console.info = origInfo;
    }
  });
});

/**
 * B-03 (bornière) — les colonnes « acteur » uuid nullables reçoivent
 * des valeurs héritées non-UUID ("local-user" d'anciennes versions) :
 * l'upload doit les coercer en `null` (ligne sauvée) au lieu d'être
 * rejeté 22P02 et l'op jetée. Couvre notamment `audit_entries.user_id`,
 * qui n'avait AUCUNE bornière : tout l'audit sans acteur résolu était
 * perdu en silence à la synchronisation.
 */
describe("PowerSync connector — bornière uuid acteur", () => {
  async function pushAndCapture(
    crud: Array<Record<string, unknown>>,
  ): Promise<Array<{ table: string; record: Record<string, unknown> }>> {
    const { SupabaseConnector } = await import(
      "../powersync/SupabaseConnector"
    );
    const upserts: Array<{ table: string; record: Record<string, unknown> }> =
      [];
    const connector = new SupabaseConnector();
    (connector as unknown as { client: unknown }).client = {
      from: (table: string) => ({
        upsert: async (record: Record<string, unknown>) => {
          upserts.push({ table, record });
          return { error: null };
        },
      }),
    };
    (
      connector as unknown as { ensureUploadSession: () => Promise<void> }
    ).ensureUploadSession = async () => {};
    await connector.pushCrudTransaction({
      crud,
      complete: async () => {},
    } as never);
    return upserts;
  }

  it("coercée audit_entries.user_id non-UUID en null (l'audit n'est plus rejeté)", async () => {
    const upserts = await pushAndCapture([
      {
        table: "audit_entries",
        op: UpdateType.PUT,
        id: "audit-1",
        opData: {
          org_id: "org-1",
          user_id: "local-user",
          action: "CREATE",
          entity_type: "Transaction",
          entity_id: "tx-1",
        },
      },
    ]);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].record.user_id).toBeNull();
    expect(upserts[0].record.org_id).toBe("org-1");
  });

  it("préserve un UUID acteur valide et coercée les autres colonnes acteur", async () => {
    const valid = "11111111-2222-3333-4444-555555555555";
    const upserts = await pushAndCapture([
      {
        table: "transactions",
        op: UpdateType.PUT,
        id: "tx-2",
        opData: {
          org_id: "org-1",
          created_by_id: valid,
          approved_by_id: "local-user",
        },
      },
    ]);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].record.created_by_id).toBe(valid);
    expect(upserts[0].record.approved_by_id).toBeNull();
  });
});
