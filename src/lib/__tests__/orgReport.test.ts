import { describe, it, expect } from "vitest";
import { buildOrgReport, computePeriod } from "../orgReport";

describe("buildOrgReport", () => {
  it("agrège revenus/dépenses par caisse sur la période", () => {
    const r = buildOrgReport({
      fromOrg: { id: "org-1", name: "Test Church" },
      toOrg: { id: "org-0", name: "Mother Org" },
      period: { start: "2026-10-01", end: "2026-10-31", label: "Octobre 2026" },
      transactions: [
        { id: "t1", date: "2026-10-05", type: "INCOME", amount: 5000, source: "caisse-1" },
        { id: "t2", date: "2026-10-10", type: "EXPENSE", amount: 2000, source: "caisse-1" },
        { id: "t3", date: "2026-11-05", type: "INCOME", amount: 9999, source: "caisse-1" }, // hors période
      ],
      events: [{ id: "e1", name: "Événement A", status: "COMPLETED" }],
      members: [{ id: "m1", first_name: "Jean", last_name: "Doe" }],
      documents: [{ id: "d1", title: "Document 1" }],
      document_refs: ["d1"],
    });
    expect(r.summary.totalIncome).toBe(5000);
    expect(r.summary.totalExpense).toBe(2000);
    expect(r.summary.netResult).toBe(3000);
    expect(r.summary.eventCount).toBe(1);
    expect(r.summary.memberCount).toBe(1);
    expect(r.summary.documentCount).toBe(1);
    expect(r.documents).toHaveLength(1);
  });

  it("retient uniquement les transactions de la période (bornes incluses)", () => {
    const r = buildOrgReport({
      fromOrg: { id: "o1", name: "A" },
      toOrg: { id: "o0", name: "B" },
      period: { start: "2026-10-01", end: "2026-10-31", label: "Octobre 2026" },
      transactions: [
        { id: "t1", date: "2026-10-01", type: "INCOME", amount: 100 },
        { id: "t2", date: "2026-10-31", type: "EXPENSE", amount: 50 },
        { id: "t3", date: "2026-09-30", type: "INCOME", amount: 500 },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(r.transactions).toHaveLength(2);
    expect(r.summary.totalIncome).toBe(100);
    expect(r.summary.netResult).toBe(50);
  });

  it("filtre les documents joints et normalise les champs", () => {
    const r = buildOrgReport({
      fromOrg: { id: "o1", name: "A" },
      toOrg: { id: "o0", name: "B" },
      period: { start: "2026-10-01", end: "2026-10-31", label: "Octobre 2026" },
      transactions: [
        { id: "t1", date: "2026-10-05", type: "INCOME", amount: 10, person_name: "Jean", event_id: "e9" },
      ],
      events: [
        { id: "e1", name: "Événement A", status: "COMPLETED", start_date: "2026-10-02", budget: 2000 },
      ],
      members: [{ id: "m1", first_name: "Jean", last_name: "Doe" }],
      documents: [
        { id: "d1", title: "Joint", purpose: "Pièce jointe", mime_type: "application/pdf" },
        { id: "d2", title: "Non joint" },
      ],
      document_refs: ["d1"],
    });
    expect(r.document_refs).toEqual(["d1"]);
    expect(r.documents.map((d) => d.id)).toEqual(["d1"]);
    expect(r.documents[0]).toMatchObject({
      title: "Joint",
      purpose: "Pièce jointe",
      mime_type: "application/pdf",
    });
    expect(r.transactions[0]).toMatchObject({
      type: "INCOME",
      amount: 10,
      person_name: "Jean",
      event_id: "e9",
    });
    expect(r.events[0]).toMatchObject({
      name: "Événement A",
      status: "COMPLETED",
      start_date: "2026-10-02",
      budget: 2000,
    });
    expect(r.members[0]).toEqual({ id: "m1", first_name: "Jean", last_name: "Doe" });
  });

  it("gère les entrées vides sans planter", () => {
    const r = buildOrgReport({
      fromOrg: { id: "o1", name: "A" },
      toOrg: { id: "o0", name: "B" },
      period: { start: "2026-10-01", end: "2026-10-31", label: "Octobre 2026" },
      transactions: [],
      events: [],
      members: [],
      documents: [],
    });
    expect(r.summary).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      netResult: 0,
      eventCount: 0,
      memberCount: 0,
      documentCount: 0,
    });
    expect(r.document_refs).toEqual([]);
  });
});

describe("computePeriod", () => {
  it("mensuel : bornes du mois courant + libellé FR", () => {
    const p = computePeriod("monthly", new Date(2026, 9, 15)); // octobre 2026
    expect(p).toEqual({
      start: "2026-10-01",
      end: "2026-10-31",
      label: "Octobre 2026",
    });
  });

  it("semestriel : S1 (janv–juin) et S2 (juil–déc)", () => {
    expect(computePeriod("semiannual", new Date(2026, 2, 10))).toEqual({
      start: "2026-01-01",
      end: "2026-06-30",
      label: "S1 2026",
    });
    expect(computePeriod("semiannual", new Date(2026, 11, 1))).toEqual({
      start: "2026-07-01",
      end: "2026-12-31",
      label: "S2 2026",
    });
  });

  it("annuel : année complète", () => {
    expect(computePeriod("annual", new Date(2026, 5, 15))).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
      label: "2026",
    });
  });
});
