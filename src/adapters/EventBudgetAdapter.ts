import type { EventBudget, BudgetLine } from "@/types";

/**
 * EventBudgetAdapter — bridge between JSONB budget_items and canonical tables
 *
 * Events store budget as a JSONB array (`budget_items`).
 * The canonical model uses separate `event_budgets` and `budget_lines` tables.
 * This adapter parses/serializes between the two formats.
 */
export class EventBudgetAdapter {
  /**
   * Parse budget_items JSONB string into EventBudget + BudgetLine[].
   * Returns null if the JSON is invalid or empty.
   */
  static fromJsonb(
    eventId: string,
    budgetItemsJson: string,
  ): { budget: EventBudget; lines: BudgetLine[] } | null {
    if (!budgetItemsJson || budgetItemsJson === "[]") return null;

    let items: any[];
    try {
      items = JSON.parse(budgetItemsJson);
    } catch {
      return null;
    }

    const budget: EventBudget = {
      id: `eb-${eventId}`,
      eventId,
      currency: "XOF",
      revisedAt: null,
      revisedBy: null,
      createdAt: new Date().toISOString(),
    };

    const lines: BudgetLine[] = items.map((item: any) => ({
      id: item.id ?? `bl-${eventId}-${item.label}`,
      eventBudgetId: budget.id,
      categoryId: item.categoryId ?? "cat-dime",
      plannedAmountCents: item.allocated ?? 0,
      actualAmountCents: item.spent ?? 0,
      createdAt: new Date().toISOString(),
    }));

    return { budget, lines };
  }

  /**
   * Serialize EventBudget + BudgetLine[] back to budget_items JSONB string.
   */
  static toJsonb(budget: EventBudget, lines: BudgetLine[]): string {
    const items = lines.map((l) => ({
      id: l.id,
      label: l.categoryId,
      allocated: l.plannedAmountCents,
      spent: l.actualAmountCents,
      categoryId: l.categoryId,
      fundedBy: "main",
    }));
    return JSON.stringify(items);
  }
}
