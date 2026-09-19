import { describe, it, expect } from "vitest";
import {
  computeBudgetReport,
  budgetWindow,
} from "../budgets";
import {
  campaignProgress,
  givenForCampaign,
  pledgedForCampaign,
  annualDonorTotal,
} from "../giving";
import type {
  PSOrgBudget,
  PSOrgBudgetLine,
  PSPledge,
  PSTaxReceipt,
  PSTransactionGiving,
} from "@/lib/dataLayer";

const budget = (over: Partial<PSOrgBudget> = {}): PSOrgBudget => ({
  id: "b1",
  org_id: "o",
  fiscal_year: 2026,
  period: "Q1",
  cost_center_id: null,
  cost_center_label: null,
  name: "B",
  total_budgeted_cents: 100_000,
  status: "ACTIVE",
  currency: "XOF",
  note: null,
  created_at: "",
  updated_at: "",
  ...over,
});

const line = (over: Partial<PSOrgBudgetLine>): PSOrgBudgetLine => ({
  id: "l",
  org_id: "o",
  budget_id: "b1",
  category_id: null,
  planned_amount_cents: 0,
  note: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("budgetWindow", () => {
  it("returns the full fiscal year for ANNUAL", () => {
    expect(budgetWindow(budget({ period: "ANNUAL" }))).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
  });
  it("maps quarters to their month ranges", () => {
    expect(budgetWindow(budget({ period: "Q1" }))).toEqual({ start: "2026-01-01", end: "2026-03-31" });
    expect(budgetWindow(budget({ period: "Q4" }))).toEqual({ start: "2026-10-01", end: "2026-12-31" });
  });
});

describe("computeBudgetReport", () => {
  const categories = [
    { id: "c_exp", label_fr: "Fonctionnement", type: "EXPENSE" },
    { id: "c_inc", label_fr: "Dîme", type: "INCOME" },
  ];

  it("sums only APPROVED, in-window, matching-direction transactions per line", () => {
    const tx = [
      { id: "t1", type: "EXPENSE", amount: 30_000, date: "2026-02-01", status: "APPROVED", category_id: "c_exp", org_unit_id: null },
      { id: "t2", type: "EXPENSE", amount: 10_000, date: "2026-02-02", status: "PENDING", category_id: "c_exp", org_unit_id: null },
      { id: "t3", type: "EXPENSE", amount: 5_000, date: "2026-05-01", status: "APPROVED", category_id: "c_exp", org_unit_id: null },
    ];
    const lines = [line({ id: "l1", category_id: "c_exp", planned_amount_cents: 50_000 })];
    const r = computeBudgetReport(budget(), lines, tx as any, categories as any);
    expect(r.lines[0].actual).toBe(30_000);
    expect(r.lines[0].variance).toBe(20_000);
    expect(r.lines[0].pctUsed).toBe(60);
    expect(r.totalActual).toBe(30_000);
    expect(r.totalPlanned).toBe(50_000);
  });

  it("tracks income lines from INCOME transactions", () => {
    const tx = [{ id: "t", type: "INCOME", amount: 12_000, date: "2026-01-15", status: "APPROVED", category_id: "c_inc", org_unit_id: null }];
    const lines = [line({ id: "li", category_id: "c_inc", planned_amount_cents: 20_000 })];
    const r = computeBudgetReport(budget(), lines, tx as any, categories as any);
    expect(r.lines[0].direction).toBe("INCOME");
    expect(r.lines[0].actual).toBe(12_000);
  });

  it("scopes actuals to the budget's cost center", () => {
    const tx = [
      { id: "a", type: "EXPENSE", amount: 10_000, date: "2026-01-05", status: "APPROVED", category_id: "c_exp", org_unit_id: "cc1" },
      { id: "b", type: "EXPENSE", amount: 9_000, date: "2026-01-05", status: "APPROVED", category_id: "c_exp", org_unit_id: "cc2" },
    ];
    const b = budget({ cost_center_id: "cc1" });
    const lines = [line({ id: "l", category_id: "c_exp", planned_amount_cents: 40_000 })];
    const r = computeBudgetReport(b, lines, tx as any, categories as any);
    expect(r.lines[0].actual).toBe(10_000);
  });

  it("flags an over-spend when actual exceeds planned", () => {
    const tx = [{ id: "t", type: "EXPENSE", amount: 80_000, date: "2026-01-05", status: "APPROVED", category_id: "c_exp", org_unit_id: null }];
    const lines = [line({ id: "l", category_id: "c_exp", planned_amount_cents: 50_000 })];
    const r = computeBudgetReport(budget(), lines, tx as any, categories as any);
    expect(r.lines[0].variance).toBe(-30_000);
    expect(r.lines[0].pctUsed).toBe(160);
  });
});

const link = (over: Partial<PSTransactionGiving>): PSTransactionGiving => ({
  id: "lk",
  org_id: "o",
  transaction_id: "t1",
  donor_id: "d1",
  campaign_id: null,
  recorded_at: "",
  created_at: "",
  updated_at: "",
  ...over,
});

const pledge = (over: Partial<PSPledge>): PSPledge => ({
  id: "p",
  org_id: "o",
  campaign_id: "cam1",
  donor_id: "d1",
  pledged_amount_cents: 0,
  schedule: "ONCE",
  amount_per_period_cents: 0,
  start_date: null,
  end_date: null,
  status: "ACTIVE",
  notes: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("campaignProgress / given / pledged", () => {
  it("computes given (approved linked tx), pledged and % of target", () => {
    const campaign = { id: "cam1", target_amount_cents: 100_000 };
    const links = [
      link({ campaign_id: "cam1" }),
      link({ transaction_id: "t2", campaign_id: "other" }),
    ];
    const tx = [
      { id: "t1", type: "INCOME", amount: 40_000, date: "2026-01-01", status: "APPROVED" },
      { id: "t2", type: "INCOME", amount: 99_000, date: "2026-01-01", status: "APPROVED" },
    ];
    const p = campaignProgress(campaign, links, [pledge({ pledged_amount_cents: 60_000 })], tx as any);
    expect(givenForCampaign(links, tx as any, "cam1")).toBe(40_000);
    expect(pledgedForCampaign([pledge({ pledged_amount_cents: 60_000 })], "cam1")).toBe(60_000);
    expect(p.given).toBe(40_000);
    expect(p.pctOfTarget).toBe(40);
    expect(p.remaining).toBe(60_000);
  });

  it("returns null pctOfTarget when target is zero", () => {
    const p = campaignProgress(
      { id: "cam1", target_amount_cents: 0 },
      [],
      [],
      [] as any,
    );
    expect(p.pctOfTarget).toBeNull();
  });
});

describe("annualDonorTotal", () => {
  it("sums a donor's income transactions for the given year only", () => {
    const links = [
      link({ donor_id: "d1", transaction_id: "t1" }),
      link({ donor_id: "d1", transaction_id: "t2" }),
      link({ donor_id: "d2", transaction_id: "t3" }),
    ];
    const tx = [
      { id: "t1", type: "INCOME", amount: 10_000, date: "2026-01-05", status: "APPROVED" },
      { id: "t2", type: "INCOME", amount: 20_000, date: "2025-06-05", status: "APPROVED" },
      { id: "t3", type: "INCOME", amount: 50_000, date: "2026-01-05", status: "APPROVED" },
    ];
    expect(annualDonorTotal(links, tx as any, "d1", 2026)).toBe(10_000);
  });
});

// Keep the tax receipt type referenced so the import is exercised.
const _r: PSTaxReceipt | null = null;
void _r;
