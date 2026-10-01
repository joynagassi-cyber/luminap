// @vitest-environment node
/**
 * T4b — dataLayer.ts : rejected_by / rejection_reason dans les SELECT
 * (getFormSubmissionPS, listFormSubmissionsPS) et l'UPDATE
 * (updateFormSubmissionPS — status REJECTED + rejectedBy + rejectionReason).
 *
 * On exécute la VRAIE dataLayer avec le module powersync mocké (PS DB
 * in-memory) : les assertions portent sur le SQL réellement émis et les
 * objets retournés. Les signatures des fonctions existantes ne changent pas
 * (form-report-audit.test.ts les mocke — voir le plan Forms v2).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted : le store PS in-memory + la dataLayer (mockée partiellement :
// getPowerSyncDatabase seule, via le mock du module powersync).
const psStore = vi.hoisted(() => ({
  calls: [] as { sql: string; params: any[] }[],
  rows: [] as any[],
  reset() {
    this.calls.length = 0;
    this.rows = [];
  },
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: (sql: string, params: any[] = []) => {
      psStore.calls.push({ sql, params });
      if (/^\s*SELECT/i.test(sql)) return { array: psStore.rows };
      return { rowsAffected: 1 };
    },
    getOptional: async () => null,
  })),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
}));

vi.mock("@/lib/cache", () => ({
  get: async () => null,
  set: async () => {},
  invalidate: () => {},
  clear: () => {},
  asyncGetOrSet: async () => null,
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  setOrganizationId: vi.fn(),
}));

import {
  getFormSubmissionPS,
  listFormSubmissionsPS,
  updateFormSubmissionPS,
} from "@/lib/dataLayer";
import type { FormSubmission } from "@/types";

// Ligne PS snake_case COMPLET (colonnes de la migration 4a).
const fullRow: any = {
  id: "fs-1",
  org_id: "org-1",
  form_definition_id: "fd-1",
  form_version: 1,
  entity_type: "member",
  entity_id: "m-1",
  data: JSON.stringify({ nom: "Aya" }),
  submitted_by: "user-1",
  submitted_at: "2026-10-01T00:00:00Z",
  status: "REJECTED",
  rejected_by: "user-2",
  rejection_reason: "pièce manquante",
  created_at: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  psStore.reset();
  vi.clearAllMocks();
});

function lastCall() {
  return psStore.calls[psStore.calls.length - 1];
}

describe("getFormSubscriptionPS — colonnes de rejet", () => {
  it("SELECTe rejected_by / rejection_reason et les mappe en camelCase", async () => {
    psStore.rows = [fullRow];
    const sub = await getFormSubmissionPS("fs-1");
    const sel = lastCall();
    expect(sel.sql).toContain("rejected_by");
    expect(sel.sql).toContain("rejection_reason");
    expect(sub).not.toBeNull();
    expect(sub!.rejectedBy).toBe("user-2");
    expect(sub!.rejectionReason).toBe("pièce manquante");
    // Les autres mappings restent stables.
    expect(sub!.status).toBe("REJECTED");
    expect(sub!.data).toEqual({ nom: "Aya" });
    expect(sub!.linkedEntityType).toBe("member");
  });

  it("gère une ligne dont les colonnes de rejet sont NULL (avant migration/sync)", async () => {
    psStore.rows = [{ ...fullRow, rejected_by: null, rejection_reason: null }];
    const sub = await getFormSubmissionPS("fs-1");
    expect(sub).not.toBeNull();
    expect(sub!.rejectedBy).toBeNull();
    expect(sub!.rejectionReason).toBeNull();
  });
});

describe("listFormSubmissionsPS — colonnes de rejet", () => {
  it("SELECTe rejected_by / rejection_reason et mappe chaque ligne", async () => {
    psStore.rows = [fullRow, { ...fullRow, id: "fs-2", rejected_by: null, rejection_reason: null }];
    const subs = await listFormSubmissionsPS({ formDefinitionId: "fd-1" });
    const sel = lastCall();
    expect(sel.sql).toContain("rejected_by");
    expect(sel.sql).toContain("rejection_reason");
    expect(subs).toHaveLength(2);
    expect(subs[0].rejectedBy).toBe("user-2");
    expect(subs[0].rejectionReason).toBe("pièce manquante");
    expect(subs[1].rejectedBy).toBeNull();
  });

  it("filtre par statut REJECTED (branche filtre inchangée)", async () => {
    psStore.rows = [];
    const subs = await listFormSubmissionsPS({ status: "REJECTED" });
    expect(subs).toEqual([]);
    const sel = lastCall();
    expect(sel.sql).toContain("status = ?");
    expect(sel.params).toContain("REJECTED");
  });
});

describe("updateFormSubmissionPS — REJECTED + rejectedBy + rejectionReason", () => {
  it("écrit rejected_by / rejection_reason (avec status REJECTED) et retourne l'objet fusionné", async () => {
    psStore.rows = [fullRow];
    const updated = await updateFormSubmissionPS("fs-1", {
      status: "REJECTED",
      rejectedBy: "user-2",
      rejectionReason: "montant incorrect",
    } as Partial<FormSubmission>);
    const upd = psStore.calls.find((c) => /^UPDATE/i.test(c.sql))!;
    expect(upd.sql).toContain("rejected_by = ?");
    expect(upd.sql).toContain("rejection_reason = ?");
    expect(upd.sql).toContain("status = ?");
    expect(upd.params).toContain("user-2");
    expect(upd.params).toContain("montant incorrect");
    expect(upd.params).toContain("REJECTED");
    expect(updated).not.toBeNull();
    expect(updated!.rejectedBy).toBe("user-2");
    expect(updated!.rejectionReason).toBe("montant incorrect");
    expect(updated!.status).toBe("REJECTED");
  });

  it("écrit uniquement rejected_by quand seule la branche est passée", async () => {
    psStore.rows = [fullRow];
    await updateFormSubmissionPS("fs-1", { rejectedBy: "user-9" });
    const upd = psStore.calls.find((c) => /^UPDATE/i.test(c.sql))!;
    expect(upd.sql).toContain("rejected_by = ?");
    expect(upd.sql).not.toContain("rejection_reason");
    expect(upd.params).toContain("user-9");
  });

  it("ne boucle pas quand les nouveaux champs sont absents (signature stable)", async () => {
    psStore.rows = [fullRow];
    const updated = await updateFormSubmissionPS("fs-1", { status: "PROCESSED" });
    const upd = psStore.calls.find((c) => /^UPDATE/i.test(c.sql))!;
    expect(upd.sql).toContain("status = ?");
    expect(upd.sql).not.toContain("rejected_by");
    expect(updated!.status).toBe("PROCESSED");
  });

  it("retourne null si la soumission n'existe pas (pas d'UPDATE)", async () => {
    psStore.rows = [];
    const updated = await updateFormSubmissionPS("fs-x", {
      status: "REJECTED",
      rejectedBy: "u",
      rejectionReason: "r",
    } as Partial<FormSubmission>);
    expect(updated).toBeNull();
    expect(psStore.calls.some((c) => /^UPDATE/i.test(c.sql))).toBe(false);
  });
});
