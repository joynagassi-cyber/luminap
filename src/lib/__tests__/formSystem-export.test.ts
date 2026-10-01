/**
 * Tests pour exportSubmissionsAsXLSX (src/lib/formSystem.ts).
 *
 * Mocks :
 *  - xlsx : book_new / aoa_to_sheet / book_append_sheet / writeFile
 *  - @/lib/dataLayer : stubs neutres (imports transitifs de formSystem)
 *  - @/lib/orgContext, @/lib/utils, @/lib/powersync, @/lib/cache : neutres
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => "SHEET"),
    book_new: vi.fn(() => "WB"),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock("@/lib/dataLayer", () => ({
  createFormDefinitionPS: vi.fn(),
  getFormDefinitionPS: vi.fn(async () => null),
  listFormDefinitionsPS: vi.fn(async () => []),
  updateFormDefinitionPS: vi.fn(),
  deleteFormDefinitionPS: vi.fn(),
  createFormSubmissionPS: vi.fn(),
  getFormSubmissionPS: vi.fn(async () => null),
  listFormSubmissionsPS: vi.fn(async () => []),
  updateFormSubmissionPS: vi.fn(),
  addMemberPS: vi.fn(async () => "m-1"),
  addEventPS: vi.fn(async () => "e-1"),
  createGroupPS: vi.fn(async () => "g-1"),
  executeWrite: vi.fn(async () => 1),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-1"),
}));

vi.mock("@/lib/utils", () => ({ generateId: vi.fn(() => "gen-id") }));

vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn(async () => undefined) }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async () => ({ rowsAffected: 1 })),
  })),
}));

vi.mock("@/lib/cache", () => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
}));

import { exportSubmissionsAsXLSX } from "@/lib/formSystem";
import * as XLSX from "xlsx";
import type { FormDefinition, FormSubmission } from "@/types";

const formDef: FormDefinition = {
  id: "f-1",
  orgId: "org-1",
  key: "bapteme",
  name: "Baptêmes",
  version: 1,
  status: "PUBLISHED",
  fields: [
    { key: "nom", label: "Nom", type: "text", required: true, order: 1 },
    { key: "date_bapteme", label: "Date", type: "date", required: false, order: 0 },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const sub: FormSubmission = {
  id: "s1",
  orgId: "org-1",
  formDefinitionId: "f-1",
  formVersion: 1,
  submittedBy: "u1",
  submittedAt: "2026-10-01T10:00:00Z",
  data: { nom: "Jean", date_bapteme: "2026-10-01" },
  status: "SUBMITTED",
  createdAt: "2026-10-01T10:00:00Z",
};

describe("exportSubmissionsAsXLSX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produit un workbook : une feuille, lignes = métadonnées + union des clés data", () => {
    exportSubmissionsAsXLSX([sub], formDef, "prefix");

    const aoa = (XLSX.utils.aoa_to_sheet as any).mock.calls[0][0];
    expect(aoa).toEqual([
      [
        "Soumetteur",
        "Date",
        "Date",
        "Nom",
        "Statut",
        "Rejeté par",
        "Raison du rejet",
      ],
      [
        "u1",
        "2026-10-01T10:00:00Z",
        "2026-10-01",
        "Jean",
        "SUBMITTED",
        "",
        "",
      ],
    ]);
    expect((XLSX.utils.book_new as any)).toHaveBeenCalledTimes(1);
    expect((XLSX.utils.book_append_sheet as any)).toHaveBeenCalledWith(
      "WB",
      "SHEET",
      "Soumissions",
    );
    expect((XLSX.writeFile as any)).toHaveBeenCalledWith("WB", "prefix.xlsx");
  });

  it("inclut les colonnes méta vides (null) et les clés data hors définition", () => {
    const sub2 = {
      ...sub,
      id: "s2",
      submittedBy: null,
      status: "REJECTED",
      rejectedBy: "admin",
      rejectionReason: "pièce manquante",
      data: { nom: "Marie", note_extra: "colonne ad hoc" } as Record<string, any>,
    } as unknown as FormSubmission;

    exportSubmissionsAsXLSX([sub, sub2], formDef, "x");

    const aoa = (XLSX.utils.aoa_to_sheet as any).mock.calls[0][0];
    expect(aoa[0]).toContain("Rejeté par");
    expect(aoa[0]).toContain("Raison du rejet");
    expect(aoa[0]).toContain("note_extra");
    const metaIdx = aoa[0].indexOf("Rejeté par");
    const reasonIdx = aoa[0].indexOf("Raison du rejet");
    expect(aoa[2][metaIdx]).toBe("admin");
    expect(aoa[2][reasonIdx]).toBe("pièce manquante");
  });
});
