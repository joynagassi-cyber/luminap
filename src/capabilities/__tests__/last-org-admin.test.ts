// @vitest-environment node
/**
 * PM5 — invariant « ≥1 propriétaire » : miroir TS du trigger SQL
 * (migration 20261026000007_guard_last_org_admin.sql).
 *
 * Le trigger DB est la barrière finale (vérifié en base, transaction annulée :
 * T1 accepte, T2/T3 refusent, T4 idempotent). Ici on verrouille le miroir client
 * `assertNotLastOrgAdmin` sur un store PS in-memory.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const ps = vi.hoisted(() => ({ rows: [] as { id: string }[] }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string) =>
      /org_admins/i.test(sql) ? { array: ps.rows } : { array: [] },
  }),
}));

vi.mock("@/lib/audit", () => ({ writeAudit: async () => {} }));

import { assertNotLastOrgAdmin } from "@/capabilities/organization/central";

describe("assertNotLastOrgAdmin — PM5", () => {
  beforeEach(() => {
    ps.rows = [];
  });

  it("accepte quand il reste un autre admin actif", async () => {
    ps.rows = [{ id: "g1" }, { id: "g2" }];
    await expect(assertNotLastOrgAdmin("org-1", "g2")).resolves.toBeUndefined();
  });

  it("REFUSE de révoquer le dernier admin actif", async () => {
    ps.rows = [{ id: "g1" }];
    await expect(assertNotLastOrgAdmin("org-1", "g1")).rejects.toThrow(
      "LAST_ORG_ADMIN",
    );
  });

  it("REFUSE quand l'org n'a plus aucun admin actif", async () => {
    ps.rows = [];
    await expect(assertNotLastOrgAdmin("org-1", "g1")).rejects.toThrow(
      "LAST_ORG_ADMIN",
    );
  });

  it("accepte de révoquer un grant déjà révoqué (idempotent)", async () => {
    ps.rows = [{ id: "g1" }];
    await expect(assertNotLastOrgAdmin("org-1", "g2")).resolves.toBeUndefined();
  });
});
