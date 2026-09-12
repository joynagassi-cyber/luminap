/**
 * Tests for src/lib/formSystem.ts, src/lib/reporting.ts, src/lib/audit.ts,
 * and src/lib/export.ts.
 *
 * Mocks:
 *  - @/lib/powersync : in-memory execute() that records every SQL call
 *  - @/lib/dataLayer : stubbed form-definition/submission writers +
 *                       addTransactionPS / useOrganizations / useCurrentUser
 *  - @/lib/orgContext: fixed org id
 *  - jspdf / jspdf-autotable / xlsx : lightweight stubs
 * No source files are modified.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted in-memory PowerSync store
const psStore = vi.hoisted(() => ({
  calls: [] as { sql: string; params: any[] }[],
  reset() {
    this.calls.length = 0;
  },
}));

function recordSql(sql: string, params: any[] = []) {
  psStore.calls.push({ sql, params });
}

// Shared transaction fixture rows shaped like the PS SELECT (snake_case)
const txFixtures: any[] = [
  {
    id: "t1", org_id: "test-org", type: "INCOME", amount: 10000,
    date: "2026-01-15", status: "APPROVED", category_id: "cat-1",
    source_caisse_id: "ca-1", event_id: null, person_name: null,
    description: "Don", version: 1,
  },
  {
    id: "t2", org_id: "test-org", type: "EXPENSE", amount: 4000,
    date: "2026-01-20", status: "APPROVED", category_id: "cat-2",
    source_caisse_id: "ca-1", event_id: null, person_name: null,
    description: "Fourniture", version: 1,
  },
  {
    id: "t3", org_id: "test-org", type: "INCOME", amount: 20000,
    date: "2026-02-10", status: "APPROVED", category_id: "cat-1",
    source_caisse_id: "ca-2", event_id: "ev-1", person_name: null,
    description: "Dime", version: 1,
  },
  {
    id: "t4", org_id: "test-org", type: "INCOME", amount: 500,
    date: "2026-01-05", status: "PENDING", category_id: "cat-1",
    source_caisse_id: "ca-1", event_id: null, person_name: null,
    description: "En attente", version: 1,
  },
];

function makeDocStub(): any {
  return {
    setFillColor: vi.fn(),
    roundedRect: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
    lastAutoTable: { finalY: 0 },
    internal: {
      pageSize: {
        getWidth: () => 297,
        getHeight: () => 210,
      },
    },
  };
}

function autoTableStub(doc: any, _opts: any): any {
  if (doc && typeof doc === "object") {
    doc.lastAutoTable = { finalY: 0 };
  }
  return doc;
}

// dataLayer mock (hoisted so factories can reference it)
const dataLayerMock = vi.hoisted(() => ({
  createFormDefinitionPS: vi.fn(async (def: any) => ({
    ...def,
    id: "fd-new",
    createdAt: "now",
    updatedAt: "now",
  })),
  getFormDefinitionPS: vi.fn(async () => null as any),
  listFormDefinitionsPS: vi.fn(async () => [] as any[]),
  updateFormDefinitionPS: vi.fn(async (id: string, data: any) => ({
    id,
    ...data,
  }) as any),
  deleteFormDefinitionPS: vi.fn(async () => {}),
  createFormSubmissionPS: vi.fn(async (sub: any) => ({
    ...sub,
    id: "fs-new",
    createdAt: "now",
    submittedAt: "now",
  })),
  getFormSubmissionPS: vi.fn(async () => null as any),
  listFormSubmissionsPS: vi.fn(async () => [] as any[]),
  updateFormSubmissionPS: vi.fn(async () => null as any),
  addTransactionPS: vi.fn(async () => "tx-new-id"),
  useOrganizations: vi.fn(() => ({ data: [] as unknown[], isLoading: false })),
  useCurrentUser: vi.fn(() => ({ data: { id: "user-1", role: "ADMIN" } })),
  canAccessOrganization: vi.fn(async () => true),
}));

const xlsxMock = vi.hoisted(() => ({
  sheets: [] as string[],
  book_new: vi.fn(() => ({})),
  aoa_to_sheet: vi.fn((aoa: any[]) => ({ "!data": aoa })),
  book_append_sheet: vi.fn((_wb: any, _ws: any, name: string) => {
    xlsxMock.sheets.push(name);
  }),
  writeFile: vi.fn(),
  utils: null as unknown,
}));
// XLSX.utils.* namespace used by export.ts
xlsxMock.utils = {
  book_new: xlsxMock.book_new,
  aoa_to_sheet: xlsxMock.aoa_to_sheet,
  book_append_sheet: xlsxMock.book_append_sheet,
};

const jsPDFClass = vi.hoisted(() =>
  vi.fn(function () {
    return makeDocStub();
  }) as any,
);

const autoTableFn = vi.hoisted(() =>
  vi.fn(function (doc: any, _opts: any): any {
    if (doc && typeof doc === "object") {
      doc.lastAutoTable = { finalY: 0 };
    }
    return doc;
  }) as any,
);

// Browser stubs needed by export.ts in a node environment
class FakeBlob {
  parts: unknown[];
  constructor(parts: unknown[], public _opts: { type?: string } = {}) {
    this.parts = parts;
  }
}
(globalThis as any).Blob = FakeBlob;
(URL as any).createObjectURL = vi.fn(() => "blob:mock-url");
(URL as any).revokeObjectURL = vi.fn();
(globalThis as any).document = {
  createElement: () => ({ href: "", download: "", click: vi.fn() }),
};

// Module mocks
const psExecute: any = vi.hoisted(() => vi.fn());

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: (sql: string, params: any[] = []) => {
      recordSql(sql, params);
      if (/^\s*SELECT/i.test(sql)) {
        if (/FROM transactions/i.test(sql)) return { array: txFixtures };
        return { array: [] };
      }
      return { rowsAffected: 1 };
    },
    getOptional: async () => null,
  })),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
}));

vi.mock("@/lib/dataLayer", () => dataLayerMock);

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "test-org",
  setOrganizationId: vi.fn(),
}));

vi.mock("xlsx", () => xlsxMock);
vi.mock("jspdf", () => ({ jsPDF: jsPDFClass }));
vi.mock("jspdf-autotable", () => ({ default: autoTableFn }));

import {
  formDefinitionRepo,
  formSubmissionRepo,
  validateFormSubmission,
  mapFormFields,
} from "@/lib/formSystem";
import { QueryBuilder, reportEngine, reportDefinitionRepo } from "@/lib/reporting";
import { auditLogRepo, writeAudit } from "@/lib/audit";
import { exportCSV, exportExcel, exportPDF } from "@/lib/export";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { clear, invalidate, set as cacheSet } from "@/lib/cache";
import type {
  FormDefinition,
  FormSubmission,
  Transaction,
  Caisse,
  Event,
  ReportDefinition,
} from "@/types";

// Fixtures
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "tx-1",
    orgId: "test-org",
    type: "INCOME",
    amount: 10000,
    description: "Don",
    date: "2026-01-15",
    status: "APPROVED",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    createdById: "user-1",
    approvedById: "user-2",
    approvedAt: "2026-01-16T00:00:00.000Z",
    categoryId: "cat-1",
    orgUnitId: null,
    eventId: null,
    source: "CAISSE",
    personName: null,
    compensatesFor: null,
    comment: null,
    version: 1,
    sourceCaisseId: "ca-1",
    versementId: null,
    reversalOfId: null,
    ...overrides,
  } as Transaction;
}

function makeCaisse(overrides: Partial<Caisse> = {}): Caisse {
  return {
    id: "ca-1",
    name: "Caisse Principale",
    description: "d",
    type: "MAIN",
    color: "#3B82F6",
    orgId: "test-org",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    status: "ACTIVE",
    ...overrides,
  } as Caisse;
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "ev-1",
    orgId: "test-org",
    name: "Gala",
    description: "Gala annuel",
    startDate: "2026-10-01",
    endDate: "2026-10-02",
    status: "PLANIFIED",
    type: "EVENT",
    budget: 1000000,
    budgetItems: [],
    shoppingItems: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  } as Event;
}

function makeFormDef(overrides: Partial<FormDefinition> = {}): FormDefinition {
  return {
    id: "fd-1",
    orgId: "test-org",
    key: "don-form",
    name: "Formulaire de don",
    version: 1,
    status: "PUBLISHED",
    fields: [
      { key: "nom", label: "Nom", type: "text", required: true },
      { key: "montant", label: "Montant", type: "number", required: true, validation: { min: 100, max: 1000000 } },
      { key: "dateDon", label: "Date", type: "date", required: false },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as FormDefinition;
}

function makeSubmission(
  overrides: Partial<FormSubmission> = {},
): FormSubmission {
  return {
    id: "fs-1",
    orgId: "test-org",
    formDefinitionId: "fd-1",
    formVersion: 1,
    submittedBy: "user-1",
    submittedAt: "2026-01-15T00:00:00.000Z",
    data: { nom: "Aya" },
    status: "SUBMITTED",
    createdAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  } as FormSubmission;
}

function resetExportStubs() {
  xlsxMock.sheets.length = 0;
  xlsxMock.book_new.mockClear();
  xlsxMock.aoa_to_sheet.mockClear();
  xlsxMock.book_append_sheet.mockClear();
  xlsxMock.writeFile.mockClear();
  jsPDFClass.mockClear();
  autoTableFn.mockClear();
  autoTableFn.mockImplementation(autoTableStub);
}

beforeEach(() => {
  vi.clearAllMocks();
  psStore.reset();
  dataLayerMock.createFormDefinitionPS.mockImplementation(
    async (def: any) => ({
      ...def,
      id: "fd-new",
      createdAt: "now",
      updatedAt: "now",
    }),
  );
  dataLayerMock.getFormDefinitionPS.mockImplementation(async () => null as any);
  dataLayerMock.listFormDefinitionsPS.mockImplementation(async () => [] as any[]);
  dataLayerMock.updateFormDefinitionPS.mockImplementation(
    async (id: string, data: any) => ({ id, ...data }) as any,
  );
  dataLayerMock.deleteFormDefinitionPS.mockImplementation(async () => {});
  dataLayerMock.createFormSubmissionPS.mockImplementation(
    async (sub: any) => ({
      ...sub,
      id: "fs-new",
      createdAt: "now",
      submittedAt: "now",
    }),
  );
  dataLayerMock.getFormSubmissionPS.mockImplementation(async () => null as any);
  dataLayerMock.listFormSubmissionsPS.mockImplementation(async () => [] as any[]);
  dataLayerMock.updateFormSubmissionPS.mockImplementation(async () => null as any);
  dataLayerMock.addTransactionPS.mockImplementation(async () => "tx-new-id");
  dataLayerMock.useOrganizations.mockImplementation(
    () => ({ data: [] as unknown[], isLoading: false }),
  );
  dataLayerMock.useCurrentUser.mockImplementation(
    () => ({ data: { id: "user-1", role: "ADMIN" } }),
  );
  dataLayerMock.canAccessOrganization.mockImplementation(async () => true);
  resetExportStubs();
  clear();
});

// ─── formSystem: validateFormSubmission ────────────────────────────────────
describe("validateFormSubmission", () => {
  it("flags missing required fields", () => {
    const def = makeFormDef();
    const { valid, errors } = validateFormSubmission(def, { nom: "" });
    expect(valid).toBe(false);
    expect(errors).toContain("Field Nom is required");
    expect(errors).toContain("Field Montant is required");
  });

  it("flags a non-numeric value for a number field", () => {
    const def = makeFormDef();
    const { valid, errors } = validateFormSubmission(def, {
      nom: "Aya",
      montant: "abc",
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Field Montant must be a number");
  });

  it("flags an invalid date for a date field", () => {
    const def = makeFormDef();
    const { valid, errors } = validateFormSubmission(def, {
      nom: "Aya",
      montant: 500,
      dateDon: "not-a-date",
    });
    expect(valid).toBe(false);
    expect(errors).toContain("Field Date must be a valid date");
  });

  it("flags values below min and above max", () => {
    const def = makeFormDef();
    const below = validateFormSubmission(def, { nom: "Aya", montant: 50 });
    expect(below.errors).toContain("Field Montant must be >= 100");
    const above = validateFormSubmission(def, { nom: "Aya", montant: 5000000 });
    expect(above.errors).toContain("Field Montant must be <= 1000000");
  });

  it("returns valid=true with zero errors for a fully valid payload", () => {
    const def = makeFormDef();
    const { valid, errors } = validateFormSubmission(def, {
      nom: "Aya",
      montant: 10000,
      dateDon: "2026-01-15",
    });
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });
});

// ─── formSystem: mapFormFields ──────────────────────────────────────────────
describe("mapFormFields", () => {
  it("maps data to entity fields via mapsToEntityField", () => {
    const def = makeFormDef({
      fields: [
        { key: "nom", label: "Nom", type: "text", required: false, mapsToEntityField: "personName" },
        { key: "montant", label: "Montant", type: "number", required: false, mapsToEntityField: "amount" },
      ],
    });
    const mapped = mapFormFields(def, { nom: "Aya", montant: 5000 });
    expect(mapped).toEqual({ personName: "Aya", amount: 5000 });
  });

  it("returns an empty object when no field maps to an entity field", () => {
    const def = makeFormDef();
    const mapped = mapFormFields(def, { nom: "Aya", montant: 5000 });
    expect(mapped).toEqual({});
  });
});

// ─── formSystem: formDefinitionRepo (PS round-trip + writeAudit) ──────────
describe("formDefinitionRepo", () => {
  it("create persists via PS and writes an audit entry", async () => {
    const def = {
      orgId: "test-org",
      key: "k",
      name: "N",
      version: 1,
      status: "DRAFT" as const,
      fields: [],
    };
    const result = await formDefinitionRepo.create(def);
    expect(dataLayerMock.createFormDefinitionPS).toHaveBeenCalledWith(def);
    expect(result.id).toBe("fd-new");
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    expect(auditCalls.length).toBeGreaterThan(0);
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("FormDefinition");
    expect(last.params).toContain("fd-new");
  });

  it("get delegates to PS", async () => {
    const existing = makeFormDef();
    vi.mocked(dataLayerMock.getFormDefinitionPS).mockResolvedValueOnce(existing);
    const found = await formDefinitionRepo.get("fd-1");
    expect(dataLayerMock.getFormDefinitionPS).toHaveBeenCalledWith("fd-1");
    expect(found).toBe(existing);
  });

  it("list delegates filters to PS", async () => {
    const defs = [makeFormDef()];
    vi.mocked(dataLayerMock.listFormDefinitionsPS).mockResolvedValueOnce(defs);
    const result = await formDefinitionRepo.list({ status: "PUBLISHED" });
    expect(dataLayerMock.listFormDefinitionsPS).toHaveBeenCalledWith({
      status: "PUBLISHED",
    });
    expect(result).toEqual(defs);
  });

  it("update merges and audits before/after states", async () => {
    const existing = makeFormDef();
    vi.mocked(dataLayerMock.getFormDefinitionPS).mockResolvedValueOnce(existing);
    vi.mocked(dataLayerMock.updateFormDefinitionPS).mockResolvedValueOnce({
      ...existing,
      name: "Renamed",
    });
    const updated = await formDefinitionRepo.update("fd-1", {
      name: "Renamed",
    });
    expect(dataLayerMock.updateFormDefinitionPS).toHaveBeenCalledWith("fd-1", {
      name: "Renamed",
    });
    expect(updated?.name).toBe("Renamed");
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("UPDATE");
    expect(last.params).toContain("FormDefinition");
    expect(last.params).toContain(JSON.stringify(existing));
    expect(last.params).toContain(
      JSON.stringify({ ...existing, name: "Renamed" }),
    );
  });

  it("update returns null when the definition does not exist", async () => {
    vi.mocked(dataLayerMock.getFormDefinitionPS).mockResolvedValueOnce(null);
    const result = await formDefinitionRepo.update("missing", {
      name: "X",
    });
    expect(result).toBeNull();
    expect(dataLayerMock.updateFormDefinitionPS).not.toHaveBeenCalled();
  });

  it("delete audits the removed definition", async () => {
    const existing = makeFormDef();
    vi.mocked(dataLayerMock.getFormDefinitionPS).mockResolvedValueOnce(existing);
    await formDefinitionRepo.delete("fd-1");
    expect(dataLayerMock.deleteFormDefinitionPS).toHaveBeenCalledWith("fd-1");
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("DELETE");
    expect(last.params).toContain("fd-1");
  });

  it("delete is a no-op when the definition does not exist", async () => {
    vi.mocked(dataLayerMock.getFormDefinitionPS).mockResolvedValueOnce(null);
    await formDefinitionRepo.delete("missing");
    expect(dataLayerMock.deleteFormDefinitionPS).not.toHaveBeenCalled();
  });
});

// ─── formSystem: formSubmissionRepo ────────────────────────────────────────
describe("formSubmissionRepo", () => {
  it("create persists the submission and audits it", async () => {
    const sub = {
      orgId: "test-org",
      formDefinitionId: "fd-1",
      formVersion: 1,
      submittedBy: "user-1",
      data: { nom: "Aya" },
      status: "SUBMITTED" as const,
    };
    const result = await formSubmissionRepo.create(sub);
    expect(dataLayerMock.createFormSubmissionPS).toHaveBeenCalledWith(sub);
    expect(result.id).toBe("fs-new");
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    expect(auditCalls.length).toBeGreaterThan(0);
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("FormSubmission");
    expect(last.params).toContain("fs-new");
  });

  it("get delegates to PS", async () => {
    const sub = makeSubmission();
    vi.mocked(dataLayerMock.getFormSubmissionPS).mockResolvedValueOnce(sub);
    const found = await formSubmissionRepo.get("fs-1");
    expect(dataLayerMock.getFormSubmissionPS).toHaveBeenCalledWith("fs-1");
    expect(found).toBe(sub);
  });

  it("list delegates filters to PS", async () => {
    const subs = [makeSubmission()];
    vi.mocked(dataLayerMock.listFormSubmissionsPS).mockResolvedValueOnce(subs);
    const result = await formSubmissionRepo.list({
      formDefinitionId: "fd-1",
      status: "SUBMITTED",
    });
    expect(dataLayerMock.listFormSubmissionsPS).toHaveBeenCalledWith({
      formDefinitionId: "fd-1",
      status: "SUBMITTED",
    });
    expect(result).toEqual(subs);
  });

  it("update delegates to PS", async () => {
    vi.mocked(dataLayerMock.updateFormSubmissionPS).mockResolvedValueOnce(
      makeSubmission({ status: "PROCESSED" }) as any,
    );
    const result = await formSubmissionRepo.update("fs-1", {
      status: "PROCESSED",
    });
    expect(dataLayerMock.updateFormSubmissionPS).toHaveBeenCalledWith("fs-1", {
      status: "PROCESSED",
    });
    expect(result?.status).toBe("PROCESSED");
  });
});

// ─── reporting: QueryBuilder ───────────────────────────────────────────────
describe("QueryBuilder.build", () => {
  it("serialises dataSource/conditions/groupBy/metrics to JSON", () => {
    const json = new QueryBuilder()
      .setDataSource("transactions")
      .where("type", "eq", "INCOME")
      .where("amount", "gte", 1000)
      .groupBy("month")
      .metric("amount", "sum", "total")
      .metric("id", "count")
      .build();
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      dataSource: "transactions",
      conditions: [
        { field: "type", op: "eq", value: "INCOME" },
        { field: "amount", op: "gte", value: 1000 },
      ],
      groupBy: ["month"],
      metrics: [
        { field: "amount", fn: "sum", alias: "total" },
        { field: "id", fn: "count", alias: undefined },
      ],
    });
  });

  it("accumulates multiple groupBy calls", () => {
    const parsed = JSON.parse(
      new QueryBuilder().groupBy("month").groupBy("year").build(),
    );
    expect(parsed.groupBy).toEqual(["month", "year"]);
  });

  it("defaults to an empty shape when no clauses are added", () => {
    const parsed = JSON.parse(new QueryBuilder().build());
    expect(parsed).toEqual({
      dataSource: "transactions",
      conditions: [],
      groupBy: [],
      metrics: [],
    });
  });
});

// ─── reporting: AggregationEngine ─────────────────────────────────────────
function makeReportDef(overrides: Partial<ReportDefinition> = {}): ReportDefinition {
  return {
    id: "r1",
    orgId: "test-org",
    name: "Rapport",
    dataSource: "transactions",
    dimensions: [],
    metrics: [],
    filters: [],
    groupBy: [],
    sortBy: null,
    savedBy: null,
    isTemplate: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  } as ReportDefinition;
}

describe("AggregationEngine.execute", () => {
  it("throws on unsupported data sources", async () => {
    await expect(
      reportEngine.execute(makeReportDef({ dataSource: "events" })),
    ).rejects.toThrow("Unsupported data source");
  });

  it("aggregates form_submissions with month grouping and a data.* metric", async () => {
    // Add form_submissions fixture to the shared PS mock routing.
    const formFixtures = [
      {
        id: "s1", org_id: "test-org", form_definition_id: "f1",
        status: "SUBMITTED", submitted_by: "u1", submitted_at: "2026-01-02",
        data: JSON.stringify({ nom: "A", baptême: "2026-01-01" }),
      },
      {
        id: "s2", org_id: "test-org", form_definition_id: "f1",
        status: "SUBMITTED", submitted_by: "u2", submitted_at: "2026-01-15",
        data: JSON.stringify({ nom: "B", baptême: "2026-01-15" }),
      },
      {
        id: "s3", org_id: "test-org", form_definition_id: "f1",
        status: "SUBMITTED", submitted_by: "u3", submitted_at: "2026-02-03",
        data: JSON.stringify({ nom: "C", baptême: "2026-02-01" }),
      },
    ];
    // Patch the PS module mock to route form_submissions queries.
    const psMocked = vi.mocked(getPowerSyncDatabase);
    psMocked.mockImplementation(() => ({
      execute: (sql: string, params: any[] = []) => {
        recordSql(sql, params);
        if (/^\s*SELECT/i.test(sql)) {
          if (/FROM transactions/i.test(sql)) return { array: txFixtures };
          if (/FROM form_submissions/i.test(sql))
            return { array: formFixtures };
          return { array: [] };
        }
        return { rowsAffected: 1 };
      },
      getOptional: async () => null,
    }) as any);

    const result = await reportEngine.execute(
      makeReportDef({
        dataSource: "form_submissions",
        filters: [{ field: "formDefinitionId", value: "f1" }],
        metrics: [{ field: "id", fn: "count", alias: "count" }],
        groupBy: ["month"],
      }),
    );

    // All 3 SUBMITTED rows are aggregated.
    expect(result.total).toBe(3);
    // January has 2 (s1, s2), February has 1 (s3).
    const jan = result.rows.find((r) => r.key === "2026-01");
    const feb = result.rows.find((r) => r.key === "2026-02");
    expect(jan?.count).toBe(2);
    expect(feb?.count).toBe(1);
    // Restore the original module mock implementation.
    psMocked.mockRestore();
  });

  it("aggregates transactions with month grouping and filters", async () => {
    const result = await reportEngine.execute(
      makeReportDef({
        filters: [
          { field: "date", value: { start: "2026-01-01", end: "2026-02-28" } },
          { field: "sourceCaisseId", value: "ca-1" },
          { field: "type", value: "INCOME" },
        ],
        metrics: [
          { field: "amount", fn: "sum", alias: "total" },
          { field: "id", fn: "count", alias: "count" },
        ],
        groupBy: ["month"],
      }),
    );

    // APPROVED + ca-1 + INCOME in range leaves only t1 (t4 is PENDING, t2 is EXPENSE)
    expect(result.total).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].key).toBe("2026-01");
    expect(result.rows[0].total).toBe(10000);
    expect(result.rows[0].count).toBe(1);
    expect(result.columns).toContain("key");
    expect(result.columns).toContain("total");
  });

  it("applies categoryId filter and year grouping", async () => {
    const result = await reportEngine.execute(
      makeReportDef({
        filters: [{ field: "categoryId", value: "cat-2" }],
        metrics: [{ field: "amount", fn: "sum", alias: "total" }],
        groupBy: ["year"],
      }),
    );
    // t2 is the only APPROVED cat-2 row
    expect(result.total).toBe(1);
    expect(result.rows[0].key).toBe("2026");
    expect(result.rows[0].total).toBe(4000);
  });

  it("computes avg, min, max via metric fns", async () => {
    const result = await reportEngine.execute(
      makeReportDef({
        metrics: [
          { field: "amount", fn: "avg", alias: "avg" },
          { field: "amount", fn: "min", alias: "min" },
          { field: "amount", fn: "max", alias: "max" },
          { field: "amount", fn: "sum", alias: "sum" },
        ],
      }),
    );
    // APPROVED rows: t1(10000), t2(4000), t3(20000)
    expect(result.total).toBe(3);
    expect(result.rows[0].avg).toBe(34000 / 3);
    expect(result.rows[0].min).toBe(4000);
    expect(result.rows[0].max).toBe(20000);
    expect(result.rows[0].sum).toBe(34000);
  });

  it("groups by sourceCaisseId when present", async () => {
    const result = await reportEngine.execute(
      makeReportDef({
        metrics: [{ field: "amount", fn: "sum", alias: "total" }],
        groupBy: ["sourceCaisseId"],
      }),
    );
    const keys = result.rows.map((r) => r.key);
    expect(keys).toContain("ca-1");
    expect(keys).toContain("ca-2");
    const ca1 = result.rows.find((r) => r.key === "ca-1")!;
    expect(ca1.total).toBe(14000); // t1 + t2 (10000 + 4000)
  });

  it("returns the cached result when one is present for the report: prefix", async () => {
    const cached = {
      rows: [{ key: "2026-01", total: 99999 }],
      columns: ["key", "total"],
      total: 1,
    };

    const def = makeReportDef({
      metrics: [{ field: "amount", fn: "sum", alias: "total" }],
      groupBy: ["month"],
    });
    const cacheKey = `report:tx:${JSON.stringify({
      filters: def.filters,
      groupBy: def.groupBy,
      metrics: def.metrics,
    })}`;
    cacheSet(cacheKey, cached, { tier: "cpu" });

    // Seed the PS mock to confirm the query path is bypassed on a cache hit.
    let queried = 0;
    vi.mocked(getPowerSyncDatabase).mockReturnValue(
      {
        execute: vi.fn(async () => {
          queried += 1;
          return { array: [] };
        }),
        getOptional: vi.fn(async () => null),
      } as any,
    );

    const result = await reportEngine.execute(def);
    expect(result).toBe(cached); // returned the exact cached object
    expect(queried).toBe(0); // PS was never touched

    // Invalidate the report: prefix → cache miss → re-aggregate from PS.
    invalidate("report:");
    const second = await reportEngine.execute(def);
    expect(queried).toBe(1); // PS consulted after invalidation
    expect(second).not.toBe(cached);
    vi.mocked(getPowerSyncDatabase).mockRestore();
  });
});

// ─── reporting: reportDefinitionRepo ───────────────────────────────────────
describe("reportDefinitionRepo", () => {
  it("create persists to PS and writes an audit entry", async () => {
    const def = {
      orgId: "test-org",
      name: "Rapport de caisse",
      dataSource: "transactions",
      dimensions: ["amount"],
      metrics: ["sum"],
      filters: [],
      groupBy: ["month"],
      sortBy: null,
      savedBy: "user-1",
      isTemplate: false,
    };
    const result = await reportDefinitionRepo.create(def);
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBe(result.updatedAt);
    const insertCalls = psStore.calls.filter((c) =>
      /INSERT INTO report_definitions/i.test(c.sql),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].params).toContain("Rapport de caisse");
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    expect(auditCalls.length).toBeGreaterThan(0);
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("ReportDefinition");
    expect(last.params).toContain("CREATE");
  });

  it("list returns parsed report definitions", async () => {
    vi.mocked(getPowerSyncDatabase).mockReturnValue(
      {
        execute: vi.fn(async (sql: string, params: any[]) => {
          recordSql(sql, params);
          if (/FROM report_definitions/i.test(sql)) {
            return {
              array: [
                {
                  id: "rep-1",
                  org_id: "test-org",
                  name: "Rapport",
                  data_source: "transactions",
                  dimensions: '["amount"]',
                  metrics: '["sum"]',
                  filters: "[]",
                  group_by: '["month"]',
                  sort_by: null,
                  saved_by: "user-1",
                  is_template: 1,
                  created_at: "2026-01-01",
                  updated_at: "2026-01-01",
                },
              ],
            };
          }
          return { array: [] };
        }),
        getOptional: vi.fn(async () => null),
      } as any,
    );

    const defs = await reportDefinitionRepo.list();
    expect(defs).toHaveLength(1);
    expect(defs[0].id).toBe("rep-1");
    expect(defs[0].name).toBe("Rapport");
    expect(defs[0].dimensions).toEqual(["amount"]);
    expect(defs[0].groupBy).toEqual(["month"]);
    expect(defs[0].isTemplate).toBe(1);
  });

  it("delete removes the row and invalidates the report cache", async () => {
    await reportDefinitionRepo.delete("rep-1");
    const delCalls = psStore.calls.filter((c) =>
      /DELETE FROM report_definitions/i.test(c.sql),
    );
    expect(delCalls).toHaveLength(1);
    expect(delCalls[0].params).toEqual(["rep-1"]);
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    const last = auditCalls[auditCalls.length - 1];
    expect(last.params).toContain("ReportDefinition");
    expect(last.params).toContain("DELETE");
  });
});

// ─── audit ──────────────────────────────────────────────────────────────────
describe("auditLogRepo.write", () => {
  it("generates an id + createdAt and JSON-stringifies before/after", async () => {
    await auditLogRepo.write({
      orgId: "test-org",
      transactionId: "tx-1",
      userId: "user-1",
      actorRoleAtTime: "ADMIN",
      action: "APPROVE",
      entityType: "Transaction",
      entityId: "tx-1",
      beforeState: { status: "PENDING" },
      afterState: { status: "APPROVED" },
      comment: "approuvé",
    });

    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    expect(auditCalls).toHaveLength(1);
    const [call] = auditCalls;
    expect(call.params).toContain("tx-1"); // transaction_id
    expect(call.params).toContain("APPROVE");
    expect(call.params).toContain('{"status":"PENDING"}');
    expect(call.params).toContain('{"status":"APPROVED"}');
    expect(call.params).toContain("approuvé");
    // id is generated (non-empty string)
    const idParam = call.params[0];
    expect(typeof idParam).toBe("string");
    expect(idParam.length).toBeGreaterThan(0);
    // createdAt is an ISO timestamp
    const createdAt = call.params[call.params.length - 1];
    expect(new Date(createdAt).toISOString()).toBe(createdAt);
  });

  it("writes via the writeAudit convenience wrapper", async () => {
    await writeAudit({
      orgId: "test-org",
      transactionId: null,
      userId: "user-1",
      actorRoleAtTime: null,
      action: "CREATE",
      entityType: "Caisse",
      entityId: "ca-9",
      beforeState: null,
      afterState: { id: "ca-9", name: "Nouvelle caisse" },
      comment: null,
    });
    const auditCalls = psStore.calls.filter((c) =>
      /INSERT INTO audit_entries/i.test(c.sql),
    );
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0].params).toContain("Caisse");
    expect(auditCalls[0].params).toContain('{"id":"ca-9","name":"Nouvelle caisse"}');
  });
});

describe("auditLogRepo.list", () => {
  it("builds a filtered query and caches the result", async () => {
    const rows = [
      {
        id: "a1",
        org_id: "test-org",
        transaction_id: null,
        user_id: "user-1",
        actor_role_at_time: null,
        action: "CREATE",
        entity_type: "Caisse",
        entity_id: "ca-1",
        created_at: "2026-01-01",
      },
    ];
    vi.mocked(getPowerSyncDatabase).mockReturnValue(
      {
        execute: vi.fn(async (sql: string, params: any[]) => {
          recordSql(sql, params);
          return { array: rows };
        }),
        getOptional: vi.fn(async () => null),
      } as any,
    );

    const filters = {
      entityType: "Caisse",
      action: "CREATE",
      actorId: "user-1",
    };
    const entries = await auditLogRepo.list(filters);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("a1");
    expect(entries[0].entityType).toBe("Caisse");
    expect(entries[0].action).toBe("CREATE");
    expect(entries[0].beforeState).toBeNull();
    expect(entries[0].afterState).toBeNull();

    // The cached value is returned on a second identical call without re-querying.
    const selCount = () =>
      psStore.calls.filter(
        (c) => /SELECT/i.test(c.sql) && /audit_entries/i.test(c.sql),
      ).length;
    const before = selCount();
    const cached = await auditLogRepo.list(filters);
    expect(cached).toBe(entries); // same reference (cache hit)
    expect(selCount()).toBe(before); // no new SELECT
  });

  it("getByEntity delegates to list with entityType + entityId", async () => {
    vi.mocked(getPowerSyncDatabase).mockReturnValue(
      {
        execute: vi.fn(async (sql: string, params: any[] = []) => {
          recordSql(sql, params);
          return { array: [] };
        }),
        getOptional: vi.fn(async () => null),
      } as any,
    );
    const result = await auditLogRepo.getByEntity("Caisse", "ca-1");
    expect(result).toEqual([]);
    const sel = psStore.calls.filter(
      (c) => /SELECT/i.test(c.sql) && /audit_entries/i.test(c.sql),
    );
    const call = sel[sel.length - 1];
    expect(call.params).toContain("Caisse");
    expect(call.params).toContain("ca-1");
  });
});

// ─── export: exportCSV ─────────────────────────────────────────────────────
function lastCsvBlob(): FakeBlob {
  const urlSpy = vi.mocked((URL as any).createObjectURL);
  return urlSpy.mock.calls[0][0] as FakeBlob;
}

describe("exportCSV", () => {
  it("emits a BOM-prefixed CSV sorted by date desc with amount/100", () => {
    const txs = [
      makeTx({ id: "a", date: "2026-01-01", amount: 10000, type: "INCOME" }),
      makeTx({ id: "b", date: "2026-02-01", amount: 2500, type: "EXPENSE" }),
    ];
    const caisses = [makeCaisse()];
    exportCSV({ transactions: txs, caisses });

    expect((URL as any).createObjectURL).toHaveBeenCalledTimes(1);
    expect((URL as any).revokeObjectURL).toHaveBeenCalledTimes(1);
    const blob = lastCsvBlob();
    expect(blob).toBeInstanceOf(FakeBlob);
    const csvText: string = blob.parts[0] as string;
    expect(csvText.startsWith("﻿")).toBe(true);
    expect(csvText).toContain(
      "Date;Type;Catégorie;Description;Montant (FCFA);Statut;Caisse source;Versement;Événement",
    );
    // Sorted desc: the Feb row (b) precedes the Jan row (a)
    const lines = csvText.split("\n").filter((l) => l.length > 0);
    expect(lines[1]).toContain("25"); // b: 2500/100
    expect(lines[2]).toContain("100"); // a: 10000/100
  });

  it("wraps descriptions in quotes and doubles embedded quotes", () => {
    const txs = [
      makeTx({
        id: "q",
        date: "2026-03-01",
        amount: 100,
        description: 'Il dit "bonjour"',
      }),
    ];
    exportCSV({ transactions: txs });
    const csvText = lastCsvBlob().parts[0] as string;
    expect(csvText).toContain('"Il dit ""bonjour"""');
  });

  it("marks the versement and event columns when present", () => {
    const txs = [
      makeTx({
        id: "v",
        date: "2026-03-01",
        versementId: "versement-1",
        eventId: "ev-1",
      }),
    ];
    exportCSV({ transactions: txs });
    const csvText = lastCsvBlob().parts[0] as string;
    expect(csvText).toContain("Oui;ev-1");
  });
});

// ─── export: exportExcel ───────────────────────────────────────────────────
describe("exportExcel", () => {
  it("builds Résumé + Transactions sheets with /100 amounts, sorted desc", () => {
    const txs = [
      makeTx({ id: "a", date: "2026-01-01", amount: 10000, type: "INCOME" }),
      makeTx({ id: "b", date: "2026-02-01", amount: 2000, type: "EXPENSE" }),
    ];
    exportExcel({ transactions: txs });
    expect(xlsxMock.book_new).toHaveBeenCalledTimes(1);
    const sheetNames = xlsxMock.book_append_sheet.mock.calls.map(
      (c: any[]) => c[2],
    );
    expect(sheetNames).toContain("Résumé");
    expect(sheetNames).toContain("Transactions");
    expect(xlsxMock.writeFile).toHaveBeenCalledTimes(1);
    expect(xlsxMock.writeFile.mock.calls[0][1]).toMatch(/\.xlsx$/);
    // Summary sheet carries /100 amounts
    const summarySheet = xlsxMock.aoa_to_sheet.mock.calls
      .map((c: any[]) => c[0])
      .find((aoa: any[]) => aoa[0][0] === "Lumina — Rapport financier");
    expect(summarySheet).toBeDefined();
    // Transactions sheet sorted desc (Feb row precedes Jan row)
    const txSheet = xlsxMock.aoa_to_sheet.mock.calls
      .map((c: any[]) => c[0])
      .find((aoa: any[]) => aoa[0][0] === "Date" && aoa[0][1] === "Type");
    expect(txSheet[1][0]).toMatch(/fév/);
    expect(txSheet[2][0]).toMatch(/janv/);
  });

  it("adds a Versements sheet when versementList is provided", () => {
    const caisses = [makeCaisse()];
    exportExcel({
      transactions: [makeTx()],
      versementList: [
        { amount: 5000, date: "2026-01-15", sourceCaisseId: "ca-1" },
      ],
      caisses,
    });
    const sheetNames = xlsxMock.book_append_sheet.mock.calls.map(
      (c: any[]) => c[2],
    );
    expect(sheetNames).toContain("Versements");
  });

  it("adds a Par groupe sheet when caisses are provided", () => {
    const caisses = [makeCaisse()];
    exportExcel({ transactions: [makeTx()], caisses });
    const sheetNames = xlsxMock.book_append_sheet.mock.calls.map(
      (c: any[]) => c[2],
    );
    expect(sheetNames).toContain("Par groupe");
  });

  it("adds a Budget événement sheet when event is provided", () => {
    const event = makeEvent({
      budgetItems: [
        {
          id: "bi-1",
          eventId: "ev-1",
          label: "Déco",
          allocated: 100000,
          spent: 50000,
          fundedBy: "main",
        },
      ],
    });
    exportExcel({ transactions: [makeTx()], event });
    const sheetNames = xlsxMock.book_append_sheet.mock.calls.map(
      (c: any[]) => c[2],
    );
    expect(sheetNames).toContain("Budget événement");
  });
});

// ─── export: exportPDF ─────────────────────────────────────────────────────
describe("exportPDF", () => {
  it("produces one document with a save() call and a transactions table", () => {
    const txs = [
      makeTx({ id: "a", date: "2026-01-01", amount: 10000, type: "INCOME" }),
      makeTx({ id: "b", date: "2026-02-01", amount: 2000, type: "EXPENSE" }),
    ];
    exportPDF({ transactions: txs });
    // jsPDF constructor called once
    expect(jsPDFClass).toHaveBeenCalledTimes(1);
    const savedDoc = jsPDFClass.mock.results[0].value as any;
    expect(savedDoc.save).toHaveBeenCalledTimes(1);
    expect(savedDoc.save.mock.calls[0][0]).toMatch(/\.pdf$/);
    // The main transactions table has 2 body rows (one per transaction)
    const mainCall = autoTableFn.mock.calls.find(
      (c: any[]) => c[1]?.head?.[0]?.[0] === "Date" && c[1]?.body?.length === 2,
    );
    expect(mainCall).toBeDefined();
    expect(mainCall![1].body).toHaveLength(2);
  });

  it("adds a versements section when versementList is present", () => {
    const caisses = [makeCaisse()];
    exportPDF({
      transactions: [makeTx()],
      versementList: [
        { amount: 500, date: "2026-01-01", sourceCaisseId: "ca-1" },
      ],
      caisses,
    });
    // Versements table: body rows have 3 columns
    const verseCall = autoTableFn.mock.calls.find(
      (c: any[]) => c[1]?.body?.[0]?.length === 3,
    );
    expect(verseCall).toBeDefined();
  });

  it("draws the footer via didDrawPage without throwing", () => {
    const manyTxs: Transaction[] = Array.from({ length: 40 }, (_, i) =>
      makeTx({ id: `t${i}`, date: "2026-01-01", amount: 100 }),
    );
    exportPDF({ transactions: manyTxs });
    const mainCall = autoTableFn.mock.calls.find(
      (c: any[]) => c[1]?.body && c[1].body.length === 40,
    );
    expect(mainCall).toBeDefined();
    const didDrawPage = mainCall![1].didDrawPage;
    expect(typeof didDrawPage).toBe("function");
    expect(() => didDrawPage({ pageNumber: 1 })).not.toThrow();
  });
});
