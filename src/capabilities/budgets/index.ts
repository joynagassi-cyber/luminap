/**
 * Budgets Capability — budget organisationnel par centre de coûts.
 *
 * P0 « grande église » : budgets annuel / trimestriel par centre de coûts,
 * avec l'écart prévu / réel calculé sur les transactions immuables
 * (APPROVED). Le « réel » n'est JAMAIS stocké : il est dérivé, donc
 * toujours cohérent avec le grand livre.
 *
 * Usage :
 *   import { budgets, computeBudgetReport, budgetWindow } from "@/capabilities/budgets";
 *   await budgets.create({ name: "Budget 2026", fiscalYear: 2026, period: "ANNUAL" });
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import {
  addOrgBudgetPS,
  updateOrgBudgetPS,
  deleteOrgBudgetPS,
  addOrgBudgetLinePS,
  updateOrgBudgetLinePS,
  deleteOrgBudgetLinePS,
  type PSOrgBudget,
  type PSOrgBudgetLine,
} from "@/lib/dataLayer";

export type BudgetPeriod = "ANNUAL" | "Q1" | "Q2" | "Q3" | "Q4";

export interface CreateBudgetInput {
  name: string;
  fiscalYear: number;
  period?: BudgetPeriod;
  costCenterId?: string | null;
  costCenterLabel?: string | null;
  totalBudgetedCents?: number;
  currency?: string;
  note?: string | null;
  lines?: Array<{
    categoryId?: string | null;
    plannedAmountCents: number;
    note?: string | null;
  }>;
}

export interface ComputedLine {
  lineId: string;
  categoryId: string | null;
  categoryLabel: string;
  direction: "INCOME" | "EXPENSE";
  planned: number;
  actual: number;
  /** prévu - réel (positif = restant disponible, négatif = dépassement). */
  variance: number;
  /** réel / prévu × 100 (null si prévu = 0). */
  pctUsed: number | null;
}

export interface BudgetReport {
  budget: PSOrgBudget;
  lines: ComputedLine[];
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  pctUsed: number | null;
}

const QUARTER_END: Record<string, [number, number]> = {
  ANNUAL: [1, 12],
  Q1: [1, 3],
  Q2: [4, 6],
  Q3: [7, 9],
  Q4: [10, 12],
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Fenêtre [début, fin] (YYYY-MM-DD) couverte par un budget.
 * Comparaison sur le préfixe date (slice(0,10)) pour être robuste au format
 * de stockage de `transactions.date`.
 */
export function budgetWindow(
  budget: Pick<PSOrgBudget, "fiscal_year" | "period">,
): { start: string; end: string } {
  const y = budget.fiscal_year;
  const [m1, m2] = QUARTER_END[budget.period] ?? QUARTER_END.ANNUAL;
  return { start: `${y}-${pad(m1)}-01`, end: `${y}-${pad(m2)}-31` };
}

type TxLike = {
  type: string;
  amount: number;
  date: string;
  status: string;
  category_id?: string | null;
  org_unit_id?: string | null;
};

/**
 * Calcule le rapport d'un budget : prévu / réel / écart par ligne + totaux.
 * Fonction pure — testable sans base de données.
 */
export function computeBudgetReport(
  budget: PSOrgBudget,
  lines: PSOrgBudgetLine[],
  transactions: TxLike[],
  categories: Array<{ id: string; label_fr?: string; label?: string; type?: string }>,
): BudgetReport {
  const { start, end } = budgetWindow(budget);
  const catType = new Map(categories.map((c) => [c.id, c.type] as const));

  const inWindow = transactions.filter((t) => {
    if (t.status !== "APPROVED") return false;
    const d = String(t.date).slice(0, 10);
    if (d < start || d > end) return false;
    if (budget.cost_center_id && t.org_unit_id !== budget.cost_center_id)
      return false;
    return true;
  });

  const catLabel = (id: string | null) => {
    if (!id) return "Autres / non catégorisé";
    const c = categories.find((x) => x.id === id);
    return c?.label_fr || c?.label || id;
  };

  const computed = lines.map((line) => {
    const direction: "INCOME" | "EXPENSE" =
      (catType.get(line.category_id ?? "") as string) === "INCOME"
        ? "INCOME"
        : "EXPENSE";
    const txs = inWindow.filter((t) => {
      if (t.type !== direction) return false;
      if (line.category_id) return t.category_id === line.category_id;
      // Pas de catégorie fixée : on agrège toutes les dépenses de la période.
      return direction === "EXPENSE" && !t.category_id;
    });
    const actual = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const planned = Number(line.planned_amount_cents) || 0;
    return {
      lineId: line.id,
      categoryId: line.category_id ?? null,
      categoryLabel: catLabel(line.category_id),
      direction,
      planned,
      actual,
      variance: planned - actual,
      pctUsed: planned > 0 ? Math.round((actual / planned) * 100) : null,
    };
  });

  const totalPlanned = computed.reduce((s, l) => s + l.planned, 0);
  const totalActual = computed.reduce((s, l) => s + l.actual, 0);
  return {
    budget,
    lines: computed,
    totalPlanned,
    totalActual,
    totalVariance: totalPlanned - totalActual,
    pctUsed: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : null,
  };
}

class BudgetsService {
  async list(): Promise<PSOrgBudget[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM org_budgets ORDER BY fiscal_year DESC");
    return (res?.array ?? []) as unknown as PSOrgBudget[];
  }

  async get(id: string): Promise<PSOrgBudget | null> {
    const db = getPowerSyncDatabase();
    const res = await db.execute("SELECT * FROM org_budgets WHERE id = ?", [id]);
    const row = res?.array?.[0];
    return row ? ((row as unknown) as PSOrgBudget) : null;
  }

  async lines(budgetId: string): Promise<PSOrgBudgetLine[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      "SELECT * FROM org_budget_lines WHERE budget_id = ? ORDER BY created_at ASC",
      [budgetId],
    );
    return (res?.array ?? []) as unknown as PSOrgBudgetLine[];
  }

  async create(input: CreateBudgetInput): Promise<string> {
    const id = await addOrgBudgetPS({
      fiscal_year: input.fiscalYear,
      period: input.period ?? "ANNUAL",
      cost_center_id: input.costCenterId ?? null,
      cost_center_label: input.costCenterLabel ?? null,
      name: input.name,
      total_budgeted_cents:
      input.totalBudgetedCents ??
      (input.lines?.reduce((s, l) => s + l.plannedAmountCents, 0) ?? 0),
      status: "ACTIVE",
      currency: input.currency ?? "XOF",
      note: input.note ?? null,
    });
    for (const line of input.lines ?? []) {
      await addOrgBudgetLinePS({
        budget_id: id,
        category_id: line.categoryId ?? null,
        planned_amount_cents: line.plannedAmountCents,
        note: line.note ?? null,
      });
    }
    return id;
  }

  async update(id: string, patch: Partial<CreateBudgetInput>): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.fiscalYear !== undefined) updates.fiscal_year = patch.fiscalYear;
    if (patch.period !== undefined) updates.period = patch.period;
    if (patch.costCenterId !== undefined)
      updates.cost_center_id = patch.costCenterId;
    if (patch.costCenterLabel !== undefined)
      updates.cost_center_label = patch.costCenterLabel;
    if (patch.totalBudgetedCents !== undefined)
      updates.total_budgeted_cents = patch.totalBudgetedCents;
    if (patch.currency !== undefined) updates.currency = patch.currency;
    if (patch.note !== undefined) updates.note = patch.note;
    if (Object.keys(updates).length > 0) await updateOrgBudgetPS(id, updates);
  }

  async close(id: string): Promise<void> {
    await updateOrgBudgetPS(id, { status: "CLOSED" });
  }

  async addLine(budgetId: string, line: { categoryId?: string | null; plannedAmountCents: number; note?: string | null }): Promise<string> {
    return addOrgBudgetLinePS({
      budget_id: budgetId,
      category_id: line.categoryId ?? null,
      planned_amount_cents: line.plannedAmountCents,
      note: line.note ?? null,
    });
  }

  async updateLine(
    id: string,
    patch: { categoryId?: string | null; plannedAmountCents?: number; note?: string | null },
  ): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) updates.category_id = patch.categoryId;
    if (patch.plannedAmountCents !== undefined)
      updates.planned_amount_cents = patch.plannedAmountCents;
    if (patch.note !== undefined) updates.note = patch.note;
    await updateOrgBudgetLinePS(id, updates);
  }

  async deleteLine(id: string): Promise<void> {
    await deleteOrgBudgetLinePS(id);
  }

  async remove(id: string): Promise<void> {
    await deleteOrgBudgetPS(id);
  }
}

export const budgets = new BudgetsService();
