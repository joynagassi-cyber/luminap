// @vitest-environment node
/**
 * PR2 — écriture de la restauration (`backupRestore.ts`).
 *
 * Verrouille deux invariants du dépôt côté écriture :
 *   1. R160 — une table PowerSync est une VUE : jamais d'`UPSERT`. L'écriture
 *      fait un `SELECT id` puis `UPDATE`-ou-`INSERT` explicite. On vérifie la
 *      FORME des requêtes émises (aucun `ON CONFLICT` / `INSERT OR REPLACE`).
 *   2. Liste blanche — une table hors `RESTORABLE_TABLES` fait échouer
 *      l'écriture (un fichier trafiqué ne peut pas viser une table arbitraire).
 *
 * NON-VACUITÉ : remplacer le `SELECT`+`INSERT` par un `INSERT … ON CONFLICT`
 * ferait échouer le test « aucune écriture UPSERT ».
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const executed: { sql: string; params: unknown[] }[] = [];
const writeAudit = vi.hoisted(() =>
  vi.fn(async (_entry: Record<string, unknown>) => {}),
);
const powersyncMock = vi.hoisted(() => {
  const db = {
    execute: vi.fn(),
  };
  return {
    getPowerSyncDatabase: vi.fn(() => db),
    getPowerSyncConnector: vi.fn(),
    initPowerSync: vi.fn(async () => {}),
    disconnectPowerSync: vi.fn(async () => {}),
  };
});
vi.mock("@/lib/powersync", () => powersyncMock);
vi.mock("@/lib/audit", () => ({
  writeAudit,
  resolveAuditActor: () => ({ userId: "u-1", actorRoleAtTime: "ADMIN" }),
}));

import { getPowerSyncDatabase } from "@/lib/powersync";
import { restoreBackupRows } from "@/lib/backupRestore";
import type { RestorePlan } from "@/lib/backupImport";

function planOf(rows: { entity: string; table: string; id: string; row: Record<string, unknown> }[]): RestorePlan {
  return {
    orgId: "org-1",
    creates: rows,
    updates: [],
    conflicts: [],
    skipped: [],
    counts: { creates: rows.length, updates: 0, conflicts: 0, skipped: 0 },
  };
}

beforeEach(() => {
  executed.length = 0;
  writeAudit.mockClear();
  const db = getPowerSyncDatabase() as unknown as { execute: ReturnType<typeof vi.fn> };
  db.execute.mockReset();
  db.execute.mockImplementation(async (sql: string, params: unknown[]) => {
    executed.push({ sql, params });
    // Le SELECT d'existence ne trouve rien ⇒ INSERT.
    return { array: [], rowsAffected: 1 };
  });
});

describe("restoreBackupRows — écriture R160-safe", () => {
  it("fait SELECT puis INSERT (jamais UPSERT) pour une ligne nouvelle", async () => {
    const result = await restoreBackupRows(
      planOf([
        {
          entity: "transactions",
          table: "transactions",
          id: "t1",
          row: { org_id: "org-1", description: "Dîme" },
        },
      ]),
    );

    expect(result).toEqual({ written: 1, created: 1, updated: 0 });
    expect(executed[0].sql).toMatch(/^SELECT id FROM/);
    expect(executed[1].sql).toMatch(/^INSERT INTO/);
    for (const { sql } of executed) {
      expect(sql).not.toMatch(/ON CONFLICT|INSERT OR REPLACE/i);
    }
  });

  it("fait un UPDATE quand la ligne existe déjà", async () => {
    const db = getPowerSyncDatabase() as unknown as { execute: ReturnType<typeof vi.fn> };
    db.execute.mockImplementation(async (sql: string, params: unknown[]) => {
      executed.push({ sql, params });
      return { array: sql.startsWith("SELECT") ? [{ id: "t1" }] : [], rowsAffected: 1 };
    });

    const result = await restoreBackupRows(
      planOf([
        {
          entity: "transactions",
          table: "transactions",
          id: "t1",
          row: { org_id: "org-1", description: "Dîme corrigée" },
        },
      ]),
    );

    expect(result).toEqual({ written: 1, created: 0, updated: 1 });
    expect(executed[1].sql).toMatch(/^UPDATE `transactions` SET/);
  });

  it("sérialise les colonnes jsonb (fields) via JSONB_COLUMNS", async () => {
    await restoreBackupRows(
      planOf([
        {
          entity: "forms",
          table: "form_definitions",
          id: "f1",
          row: { org_id: "org-1", fields: [{ key: "a" }] },
        },
      ]),
    );
    const insert = executed.find((e) => e.sql.startsWith("INSERT"))!;
    expect(insert.params).toContain(JSON.stringify([{ key: "a" }]));
  });

  it("refuse une table hors liste blanche (anti-injection)", async () => {
    await expect(
      restoreBackupRows(
        planOf([
          {
            entity: "evil",
            table: "sqlite_master",
            id: "x",
            row: { org_id: "org-1" },
          },
        ]),
      ),
    ).rejects.toThrow(/non restaurable/);
    expect(executed).toHaveLength(0);
  });

  it("écrit une entrée d'audit RESTORE (NeverBreak #6 — trace non contournable)", async () => {
    await restoreBackupRows(
      planOf([
        {
          entity: "transactions",
          table: "transactions",
          id: "t1",
          row: { org_id: "org-1", description: "Dîme" },
        },
      ]),
      { sourceLabel: "sauvegarde-2026.json" },
    );

    expect(writeAudit).toHaveBeenCalledTimes(1);
    const entry = writeAudit.mock.calls[0][0] as Record<string, unknown>;
    expect(entry.action).toBe("RESTORE");
    expect(entry.entityType).toBe("Backup");
    expect(entry.orgId).toBe("org-1");
    expect(entry.entityId).toBe("sauvegarde-2026.json");
    expect(entry.userId).toBe("u-1");
  });

  it("n'écrit AUCUN audit quand une table hors liste blanche fait échouer l'écriture", async () => {
    await expect(
      restoreBackupRows(
        planOf([
          { entity: "evil", table: "sqlite_master", id: "x", row: { org_id: "org-1" } },
        ]),
      ),
    ).rejects.toThrow(/non restaurable/);
    expect(writeAudit).not.toHaveBeenCalled();
  });
});
