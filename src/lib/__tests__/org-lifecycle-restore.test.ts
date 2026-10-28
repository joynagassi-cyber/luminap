/**
 * R123 — cycle de vie d'une organisation : restauration depuis ARCHIVED.
 *
 * Deux défauts corrigés :
 *  1. `setOrganizationStatusPS(…, "ACTIVE")` remettait `status='ACTIVE'` mais
 *     LAISSAIT `archived_at/archived_by/archive_reason` en place → une
 *     organisation restaurée restait marquée « archivée le … par … pour … ».
 *  2. L'UI (`CentralAdmin`) n'offrait AUCUNE action pour une organisation
 *     ARCHIVED (branche `null`) : cul-de-sac, org irrécupérable.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const psState = vi.hoisted(() => ({ writes: [] as Array<{ sql: string; params: any[] }> }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      psState.writes.push({ sql, params });
      return { rowsAffected: 1 };
    }),
    getOptional: vi.fn(async () => null),
  })),
  getPowerSyncConnector: vi.fn(),
}));

import { setOrganizationStatusPS } from "@/lib/dataLayer";

describe("R123 — setOrganizationStatusPS", () => {
  it("ACTIVE nettoie les métadonnées d'archivage (restauration complète)", async () => {
    psState.writes.length = 0;
    await setOrganizationStatusPS("org-1", "ACTIVE", "actor-1");
    const sql = psState.writes[0].sql;
    expect(sql).toMatch(/status = 'ACTIVE'/);
    expect(sql).toMatch(/archived_at = NULL/);
    expect(sql).toMatch(/archived_by = NULL/);
    expect(sql).toMatch(/archive_reason = NULL/);
    expect(sql).toMatch(/suspended_at = NULL/);
  });

  it("ARCHIVED renseigne bien les métadonnées d'archivage", async () => {
    psState.writes.length = 0;
    await setOrganizationStatusPS("org-1", "ARCHIVED", "actor-1", "doublon");
    const w = psState.writes[0];
    expect(w.sql).toMatch(/status = 'ARCHIVED'/);
    expect(w.params).toContain("doublon");
    expect(w.params).toContain("actor-1");
  });
});

describe("R123 — câblage UI (anti « filet jamais branché »)", () => {
  const page = readFileSync(
    resolve(__dirname, "../../pages/CentralAdmin.tsx"),
    "utf8",
  );

  it("une organisation ARCHIVED expose une action de restauration", () => {
    expect(page).toMatch(/o\.status === "ARCHIVED"/);
    // La branche ARCHIVED doit déclencher reactivateOrganization.
    const idx = page.indexOf('o.status === "ARCHIVED"');
    const branch = page.slice(idx, idx + 1400);
    expect(branch).toMatch(/reactivateOrganization/);
    expect(branch).toMatch(/Restaurer/);
  });
});
