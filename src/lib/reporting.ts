import type { ReportDefinition, ReportResult } from '@/types';
import { db } from './db';
import type { Transaction } from '@/types';
import type { StoreName } from './db';

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

export interface FilterExpr {
  field: string;
  op: FilterOp;
  value: any;
}

export interface MetricExpr {
  field: string;
  fn: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'planned' | 'actual' | 'variance';
  alias?: string;
}

export class QueryBuilder {
  private conditions: FilterExpr[] = [];
  private groupByFields: string[] = [];
  private metrics: MetricExpr[] = [];
  private dataSource = 'transactions';

  setDataSource(ds: string): this { this.dataSource = ds; return this; }
  where(field: string, op: FilterOp, value: any): this { this.conditions.push({ field, op, value }); return this; }
  groupBy(...fields: string[]): this { this.groupByFields = [...this.groupByFields, ...fields]; return this; }
  metric(field: string, fn: MetricExpr['fn'], alias?: string): this { this.metrics.push({ field, fn, alias }); return this; }
  build(): string { return JSON.stringify({ dataSource: this.dataSource, conditions: this.conditions, groupBy: this.groupByFields, metrics: this.metrics }); }
}

export class AggregationEngine {
  async execute(reportDef: ReportDefinition): Promise<ReportResult> {
    if (reportDef.dataSource === 'transactions') return this.aggregateTransactions(reportDef);
    throw new Error(`Unsupported data source: ${reportDef.dataSource}`);
  }

  private async aggregateTransactions(reportDef: ReportDefinition): Promise<ReportResult> {
    const transactions = await db.getAll<Transaction>('transactions' as StoreName).catch(() => [] as Transaction[]);
    const approved = transactions.filter(t => t.status === 'APPROVED');
    let filtered = approved;

    const filters = (reportDef.filters as any[]) || [];
    for (const filter of filters) {
      if (filter.field === 'date') filtered = filtered.filter(t => t.date >= filter.value.start && t.date <= filter.value.end);
      if (filter.field === 'sourceCaisseId' && filter.value) filtered = filtered.filter(t => t.sourceCaisseId === filter.value);
      if (filter.field === 'categoryId' && filter.value) filtered = filtered.filter(t => t.categoryId === filter.value);
      if (filter.field === 'type' && filter.value) filtered = filtered.filter(t => t.type === filter.value);
    }

    const grouped = new Map<string, Transaction[]>();
    const groupBy = reportDef.groupBy || [];
    for (const tx of filtered) {
      const key = groupBy.map(g => {
        if (g === 'month') return tx.date.substring(0, 7);
        if (g === 'year') return tx.date.substring(0, 4);
        if (g === 'sourceCaisseId') return tx.sourceCaisseId || 'unknown';
        if (g === 'categoryId') return tx.categoryId;
        return '';
      }).join('|');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tx);
    }

    const rows: Record<string, any>[] = [];
    const columns = new Set<string>(['key']);
    const metrics = reportDef.metrics as unknown as MetricExpr[] || [];
    for (const metric of metrics) columns.add(metric.alias || metric.field);

    for (const [key, txs] of grouped) {
      const row: Record<string, any> = { key };
      for (const metric of metrics) {
        const values = txs.map((t: Transaction) => Number((t as any)[metric.field] || 0));
        const alias = metric.alias || metric.field;
        switch (metric.fn) {
          case 'sum': row[alias] = values.reduce((a: number, b: number) => a + b, 0); break;
          case 'count': row[alias] = values.length; break;
          case 'avg': row[alias] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0; break;
          case 'min': row[alias] = Math.min(...values); break;
          case 'max': row[alias] = Math.max(...values); break;
          default: row[alias] = 0;
        }
      }
      rows.push(row);
    }

    return { rows, columns: Array.from(columns), total: filtered.length };
  }
}

export const reportEngine = new AggregationEngine();
