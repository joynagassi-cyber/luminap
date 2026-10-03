/**
 * Test de hiérarchie 4 niveaux (mère → A → B → C) pour `buildOrgReport` +
 * `computePeriod`.
 *
 * Feature 2 / Phase 5 — validation finale (tests locaux vitest).
 */
import { describe, it, expect } from "vitest";
import { buildOrgReport, computePeriod } from "../orgReport";

describe("buildOrgReport — hiérarchie 4 niveaux", () => {
  const period = computePeriod("annual", new Date("2026-06-15"));

  it("computePeriod('annual', 2026-06-15) retourne bien la pleine année 2026", () => {
    expect(period).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
      label: "2026",
    });
  });

  it("niveau 4 (C) envoie à son père B — 1 transaction INCOME 1000", () => {
    const c = { id: "org-3", name: "C" };
    const b = { id: "org-2", name: "B" };
    const payload = buildOrgReport({
      fromOrg: c,
      toOrg: b,
      period,
      transactions: [
        { id: "t1", date: "2026-01-15", type: "INCOME", amount: 1000 },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(payload.fromOrg).toEqual(c);
    expect(payload.toOrg).toEqual(b);
    expect(payload.summary.totalIncome).toBe(1000);
    expect(payload.summary.totalExpense).toBe(0);
    expect(payload.summary.netResult).toBe(1000);
  });

  it("niveau 3 (B) envoie à son père A — agrège ses 2 transactions locales (2000+3000 = 5000)", () => {
    const b = { id: "org-2", name: "B" };
    const a = { id: "org-1", name: "A" };
    const payload = buildOrgReport({
      fromOrg: b,
      toOrg: a,
      period,
      transactions: [
        { id: "t2", date: "2026-02-15", type: "INCOME", amount: 2000 },
        { id: "t3", date: "2026-03-15", type: "INCOME", amount: 3000 },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(payload.fromOrg).toEqual(b);
    expect(payload.toOrg).toEqual(a);
    // B n'agrège QUE ses propres transactions locales : 2000 + 3000 = 5000
    expect(payload.summary.totalIncome).toBe(5000);
    expect(payload.summary.totalExpense).toBe(0);
    expect(payload.summary.netResult).toBe(5000);
  });

  it("niveau 2 (A) envoie à Mère — agrège 4000+5000+6000 = 15000", () => {
    const mother = { id: "org-0", name: "Mère" };
    const a = { id: "org-1", name: "A" };
    const payload = buildOrgReport({
      fromOrg: a,
      toOrg: mother,
      period,
      transactions: [
        { id: "t4", date: "2026-04-15", type: "INCOME", amount: 4000 },
        { id: "t5", date: "2026-05-15", type: "INCOME", amount: 5000 },
        { id: "t6", date: "2026-06-15", type: "INCOME", amount: 6000 },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(payload.fromOrg).toEqual(a);
    expect(payload.toOrg).toEqual(mother);
    // A n'agrège QUE ses propres transactions locales (pas les descendants) : 4000+5000+6000 = 15000
    expect(payload.summary.totalIncome).toBe(15000);
    expect(payload.summary.totalExpense).toBe(0);
    expect(payload.summary.netResult).toBe(15000);
  });

  it("mélange INCOME + EXPENSE sur la hiérarchie", () => {
    const mother = { id: "org-0", name: "Mère" };
    const c = { id: "org-3", name: "C" };
    const payload = buildOrgReport({
      fromOrg: c,
      toOrg: mother,
      period,
      transactions: [
        { id: "t-inc", date: "2026-02-01", type: "INCOME", amount: 10000 },
        { id: "t-exp", date: "2026-03-01", type: "EXPENSE", amount: 2500 },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(payload.summary.totalIncome).toBe(10000);
    expect(payload.summary.totalExpense).toBe(2500);
    expect(payload.summary.netResult).toBe(7500);
    expect(payload.transactions).toHaveLength(2);
  });
});
