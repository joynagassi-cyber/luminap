import type { ReportDefinition, ReportResult } from "@/types";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { generateId } from "./utils";
import { writeAudit } from "./audit";
import type { Transaction } from "@/types";
import { getOrganizationId } from "./orgContext";
import { get, set, invalidate, asyncGetOrSet } from "./cache";

/** Parse JSON defensively — returns the input unchanged on failure. */
function safeParse(raw: string | object): Record<string, any> {
  if (typeof raw === "object" && raw !== null) return raw as Record<string, any>;
  try {
    return JSON.parse(raw as string) ?? {};
  } catch {
    return {};
  }
}

export type FilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "in";

export interface FilterExpr {
  field: string;
  op: FilterOp;
  value: any;
}

export interface MetricExpr {
  field: string;
  fn:
    | "sum"
    | "count"
    | "avg"
    | "min"
    | "max"
    | "planned"
    | "actual"
    | "variance";
  alias?: string;
}

export class QueryBuilder {
  private conditions: FilterExpr[] = [];
  private groupByFields: string[] = [];
  private metrics: MetricExpr[] = [];
  private dataSource = "transactions";

  setDataSource(ds: string): this {
    this.dataSource = ds;
    return this;
  }
  where(field: string, op: FilterOp, value: any): this {
    this.conditions.push({ field, op, value });
    return this;
  }
  groupBy(...fields: string[]): this {
    this.groupByFields = [...this.groupByFields, ...fields];
    return this;
  }
  metric(field: string, fn: MetricExpr["fn"], alias?: string): this {
    this.metrics.push({ field, fn, alias });
    return this;
  }
  build(): string {
    return JSON.stringify({
      dataSource: this.dataSource,
      conditions: this.conditions,
      groupBy: this.groupByFields,
      metrics: this.metrics,
    });
  }
}

export class AggregationEngine {
  async execute(reportDef: ReportDefinition): Promise<ReportResult> {
    if (reportDef.dataSource === "transactions")
      return this.aggregateTransactions(reportDef);
    if (reportDef.dataSource === "form_submissions")
      return this.aggregateFormSubmissions(reportDef);
    throw new Error(`Unsupported data source: ${reportDef.dataSource}`);
  }

  /**
   * `form_submissions` data source — aggregates the JSON responses of
   * dynamic-form submissions (e.g. number of baptisms per month).
   *
   * `metrics[].field` is resolved against:
   *   - a column of `form_submissions` directly (id, org_id, status,
   *     form_definition_id, submitted_at, …), or
   *   - a JSON path inside `data` if the field starts with `data.`
   *     (SQLite JSON extraction: `json_extract(data, '$.field')`).
   *
   * `groupBy` supports `month` / `year` (on `submitted_at`), `status`,
   * and `form_definition_id`.
   */
  private async aggregateFormSubmissions(
    reportDef: ReportDefinition,
  ): Promise<ReportResult> {
    const orgId = getOrganizationId();
    const cacheKey = `report:form:${JSON.stringify({
      filters: reportDef.filters,
      groupBy: reportDef.groupBy,
      metrics: reportDef.metrics,
    })}`;

    const cached = get<ReportResult>(cacheKey);
    if (cached) return cached;

    const db = getPowerSyncDatabase();
    const result = await db.execute(
      `SELECT id, org_id, form_definition_id, status, submitted_by, submitted_at, data
       FROM form_submissions WHERE org_id = ? AND status = ?`,
      [orgId, "SUBMITTED"],
    );
    const rows: any[] = (result?.array ?? []).map((r: any) => ({
      id: r.id,
      orgId: r.org_id,
      formDefinitionId: r.form_definition_id,
      status: r.status,
      submittedBy: r.submitted_by,
      submittedAt: r.submitted_at ?? r.created_at ?? "",
      data: typeof r.data === "string" ? safeParse(r.data) : r.data ?? {},
    }));

    const filters = (reportDef.filters as any[]) || [];
    let filtered = rows;
    for (const filter of filters) {
      if (filter.field === "formDefinitionId" && filter.value)
        filtered = filtered.filter((r) => r.formDefinitionId === filter.value);
      if (filter.field === "status" && filter.value)
        filtered = filtered.filter((r) => r.status === filter.value);
      if (filter.field === "submittedBy" && filter.value)
        filtered = filtered.filter((r) => r.submittedBy === filter.value);
      if (filter.field === "date")
        filtered = filtered.filter(
          (r) =>
            r.submittedAt >= filter.value.start &&
            r.submittedAt <= filter.value.end,
        );
    }

    // Resolve the metric value from the row.
    const resolveValue = (row: any, field: string): any => {
      if (field.startsWith("data.")) {
        const key = field.slice("data.".length);
        return row.data?.[key];
      }
      return row[field];
    };

    const grouped = new Map<string, any[]>();
    const groupBy = reportDef.groupBy || [];
    for (const row of filtered) {
      const key = groupBy
        .map((g) => {
          if (g === "month") return row.submittedAt.substring(0, 7);
          if (g === "year") return row.submittedAt.substring(0, 4);
          if (g === "status") return row.status;
          if (g === "formDefinitionId")
            return row.formDefinitionId || "unknown";
          if (g.startsWith("data.")) return String(resolveValue(row, g));
          return "";
        })
        .join("|");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }

    const outRows: Record<string, any>[] = [];
    const columns = new Set<string>(["key"]);
    const metrics = (reportDef.metrics as unknown as MetricExpr[]) || [];
    for (const metric of metrics) columns.add(metric.alias || metric.field);

    for (const [key, items] of grouped) {
      const outRow: Record<string, any> = { key };
      for (const metric of metrics) {
        const values = items.map((r) => resolveValue(r, metric.field));
        const nums = values.map((v) => Number(v ?? 0));
        const alias = metric.alias || metric.field;
        switch (metric.fn) {
          case "sum":
            outRow[alias] = nums.reduce((a, b) => a + b, 0);
            break;
          case "count":
            outRow[alias] = nums.length;
            break;
          case "avg":
            outRow[alias] =
              nums.length > 0
                ? nums.reduce((a, b) => a + b, 0) / nums.length
                : 0;
            break;
          case "min":
            outRow[alias] = nums.length ? Math.min(...nums) : 0;
            break;
          case "max":
            outRow[alias] = nums.length ? Math.max(...nums) : 0;
            break;
          default:
            outRow[alias] = 0;
        }
      }
      outRows.push(outRow);
    }

    const out: ReportResult = {
      rows: outRows,
      columns: Array.from(columns),
      total: filtered.length,
    };
    set(cacheKey, out);
    return out;
  }

  private async aggregateTransactions(
    reportDef: ReportDefinition,
  ): Promise<ReportResult> {
    const orgId = getOrganizationId();
    const cacheKey = `report:tx:${JSON.stringify({ filters: reportDef.filters, groupBy: reportDef.groupBy, metrics: reportDef.metrics })}`;

    const cached = get<ReportResult>(cacheKey);
    if (cached) return cached;

    const db = getPowerSyncDatabase();
    // Only fetch columns needed for aggregation - exclude large text fields not used in metrics
    const result = await db.execute(
      `SELECT id, org_id, type, amount, date, status, category_id, source_caisse_id, event_id, person_name FROM transactions WHERE org_id = ? AND status = ?`,
      [orgId, "APPROVED"],
    );
    const transactions: Transaction[] = (result?.array || []).map(
      (t: any) => ({
        id: t.id,
        orgId: t.org_id,
        type: t.type,
        amount: t.amount,
        description: t.description ?? "",
        date: t.date,
        status: t.status,
        createdAt: t.created_at ?? "",
        updatedAt: t.updated_at ?? "",
        createdById: t.created_by_id ?? "",
        approvedById: t.approved_by_id ?? null,
        approvedAt: t.approved_at ?? null,
        categoryId: t.category_id ?? null,
        orgUnitId: t.org_unit_id ?? null,
        eventId: t.event_id ?? null,
        source: t.source ?? null,
        personName: t.person_name ?? null,
        compensatesFor: null,
        comment: null,
        version: t.version ?? 1,
        sourceCaisseId: t.source_caisse_id ?? null,
        versementId: t.versement_id ?? null,
        reversalOfId: null,
        cotisationId: null,
      }),
    );
    const approved = transactions.filter((t) => t.status === "APPROVED");
    let filtered = approved;

    const filters = (reportDef.filters as any[]) || [];
    for (const filter of filters) {
      if (filter.field === "date")
        filtered = filtered.filter(
          (t) => t.date >= filter.value.start && t.date <= filter.value.end,
        );
      if (filter.field === "sourceCaisseId" && filter.value)
        filtered = filtered.filter((t) => t.sourceCaisseId === filter.value);
      if (filter.field === "categoryId" && filter.value)
        filtered = filtered.filter((t) => t.categoryId === filter.value);
      if (filter.field === "type" && filter.value)
        filtered = filtered.filter((t) => t.type === filter.value);
    }

    const grouped = new Map<string, Transaction[]>();
    const groupBy = reportDef.groupBy || [];
    for (const tx of filtered) {
      const key = groupBy
        .map((g) => {
          if (g === "month") return tx.date.substring(0, 7);
          if (g === "year") return tx.date.substring(0, 4);
          if (g === "sourceCaisseId") return tx.sourceCaisseId || "unknown";
          if (g === "categoryId") return tx.categoryId;
          return "";
        })
        .join("|");
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tx);
    }

    const rows: Record<string, any>[] = [];
    const columns = new Set<string>(["key"]);
    const metrics = (reportDef.metrics as unknown as MetricExpr[]) || [];
    for (const metric of metrics) columns.add(metric.alias || metric.field);

    for (const [key, txs] of grouped) {
      const row: Record<string, any> = { key };
      for (const metric of metrics) {
        const values = txs.map((t: Transaction) =>
          Number((t as any)[metric.field] || 0),
        );
        const alias = metric.alias || metric.field;
        switch (metric.fn) {
          case "sum":
            row[alias] = values.reduce((a: number, b: number) => a + b, 0);
            break;
          case "count":
            row[alias] = values.length;
            break;
          case "avg":
            row[alias] =
              values.length > 0
                ? values.reduce((a: number, b: number) => a + b, 0) /
                  values.length
                : 0;
            break;
          case "min":
            row[alias] = Math.min(...values);
            break;
          case "max":
            row[alias] = Math.max(...values);
            break;
          default:
            row[alias] = 0;
        }
      }
      rows.push(row);
    }

    return { rows, columns: Array.from(columns), total: filtered.length };
  }
}

export const reportEngine = new AggregationEngine();

/**
 * ReportDefinitionRepository — creates and persists report definitions with audit
 */
export const reportDefinitionRepo = {
  async create(
    def: Omit<ReportDefinition, "id" | "createdAt" | "updatedAt">,
  ): Promise<ReportDefinition> {
    const id = generateId();
    const now = new Date().toISOString();
    const entry: ReportDefinition = {
      ...def,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const db = getPowerSyncDatabase();
    await db.execute(
      `INSERT INTO report_definitions (id, org_id, name, data_source, dimensions, metrics, filters, group_by, sort_by, saved_by, is_template, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        getOrganizationId(),
        entry.name,
        entry.dataSource,
        JSON.stringify(entry.dimensions),
        JSON.stringify(entry.metrics),
        JSON.stringify(entry.filters),
        JSON.stringify(entry.groupBy),
        entry.sortBy,
        entry.savedBy,
        entry.isTemplate,
        now,
        now,
      ],
    );
    await writeAudit({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: "local-user",
      actorRoleAtTime: null,
      action: "CREATE",
      entityType: "ReportDefinition",
      entityId: id,
      beforeState: null,
      afterState: entry,
      comment: null,
    });
    return entry;
  },

  async list(): Promise<ReportDefinition[]> {
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      "SELECT id, org_id, name, data_source, dimensions, metrics, filters, group_by, sort_by, saved_by, is_template, created_at, updated_at FROM report_definitions WHERE org_id = ? ORDER BY created_at DESC",
      [getOrganizationId()],
    );
    return (result?.array || []).map((r: any) => ({
      id: r.id,
      orgId: r.org_id,
      name: r.name,
      dataSource: r.data_source,
      dimensions: JSON.parse(r.dimensions || "[]"),
      metrics: JSON.parse(r.metrics || "[]"),
      filters: JSON.parse(r.filters || "[]"),
      groupBy: JSON.parse(r.group_by || "[]"),
      sortBy: r.sort_by,
      savedBy: r.saved_by,
      isTemplate: r.is_template,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async delete(id: string): Promise<void> {
    const db = getPowerSyncDatabase();
    await db.execute("DELETE FROM report_definitions WHERE id = ?", [id]);
    await writeAudit({
      orgId: getOrganizationId(),
      transactionId: null,
      userId: "local-user",
      actorRoleAtTime: null,
      action: "DELETE",
      entityType: "ReportDefinition",
      entityId: id,
      beforeState: null,
      afterState: null,
      comment: null,
    });
    invalidate("report:");
  },
};
