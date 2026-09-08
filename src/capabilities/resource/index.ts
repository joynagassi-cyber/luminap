/**
 * Resource Capability — generic entity access and filtering
 *
 * Universal pattern: any entity stored in PowerSync can be queried
 * through a single typed interface. No domain-specific concepts.
 *
 * Usage:
 *   import { resource } from '@/capabilities/resource'
 *   const entity = await resource.get('Group', id)
 *   const items = await resource.list('Group', { filter: { status: 'ACTIVE' } })
 *   const archived = await resource.listArchived('Group')
 */

import { getPowerSyncDatabase } from '@/lib/powersync';
import { getOrganizationId } from '@/lib/orgContext';

/** Filter operator for resource queries */
export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';

/** Filter condition */
export interface FilterCondition {
  field: string;
  op: FilterOp;
  value: any;
}

/** Query options for resource listing */
export interface ResourceQuery {
  filter?: FilterCondition[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/** Generic resource result */
export interface ResourceResult<T = any> {
  items: T[];
  total: number;
  hasNext: boolean;
}

/**
 * Resource service — generic entity access via PowerSync.
 * Pure domain-agnostic query logic.
 */
export class ResourceService {
  /**
   * Get a single entity by type and id.
   * Returns null if not found.
   */
  async get<T extends { id: string }>(entityType: string, id: string): Promise<T | null> {
    const table = this.toTableName(entityType);
    const db = getPowerSyncDatabase();
    const result = await db.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    const row = result?.result?.[0] as any;
    if (!row) return null;
    return this.toResource<T>(entityType, row);
  }

  /**
   * List entities of a type with optional filtering and pagination.
   */
  async list<T extends { id: string }>(
    entityType: string,
    query?: ResourceQuery
  ): Promise<ResourceResult<T>> {
    const table = this.toTableName(entityType);
    const db = getPowerSyncDatabase();

    // Build WHERE clause from filters
    const conditions: string[] = [];
    const params: any[] = [];

    // Always filter by org_id
    conditions.push('org_id = ?');
    params.push(getOrganizationId());

    // Apply additional filters
    if (query?.filter) {
      for (const f of query.filter) {
        const paramIndex = params.length;
        switch (f.op) {
          case 'eq':
            conditions.push(`${f.field} = ?`);
            params.push(f.value);
            break;
          case 'neq':
            conditions.push(`${f.field} != ?`);
            params.push(f.value);
            break;
          case 'gt':
            conditions.push(`${f.field} > ?`);
            params.push(f.value);
            break;
          case 'gte':
            conditions.push(`${f.field} >= ?`);
            params.push(f.value);
            break;
          case 'lt':
            conditions.push(`${f.field} < ?`);
            params.push(f.value);
            break;
          case 'lte':
            conditions.push(`${f.field} <= ?`);
            params.push(f.value);
            break;
          case 'contains':
            conditions.push(`${f.field} LIKE ?`);
            params.push(`%${f.value}%`);
            break;
          case 'in':
            const placeholders = (f.value as any[]).map(() => '?').join(',');
            conditions.push(`${f.field} IN (${placeholders})`);
            params.push(...f.value);
            break;
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY
    let orderByClause = '';
    if (query?.sortBy) {
      const order = query.sortOrder || 'asc';
      orderByClause = `ORDER BY ${query.sortBy} ${order}`;
    }

    // Build LIMIT/OFFSET
    let limitClause = '';
    if (query?.limit) {
      limitClause = `LIMIT ${query.limit}`;
      if (query?.offset) {
        limitClause += ` OFFSET ${query.offset}`;
      }
    }

    // Execute query
    const sql = `SELECT * FROM ${table} ${whereClause} ${orderByClause} ${limitClause}`;
    const result = await db.execute(sql, params);
    const rows = result?.result || [];

    // Get total count (without pagination)
    const countSql = `SELECT COUNT(*) as total FROM ${table} ${conditions.length > 0 ? `WHERE ${conditions.slice(0, -1).join(' AND ')}` : ''}`;
    // Note: count query simplified — uses same conditions minus any LIMIT
    const countResult = await db.execute(
      `SELECT COUNT(*) as total FROM ${table} ${conditions.length > 0 ? 'WHERE ' + conditions.slice(0, -1).join(' AND ') : ''}`,
      params.slice(0, -1)
    );
    const totalCount = (countResult?.result?.[0]?.total as number) || 0;

    const items = rows.map((row: any) => this.toResource<T>(entityType, row));

    return {
      items,
      total: totalCount,
      hasNext: query?.limit ? items.length >= query.limit : false,
    };
  }

  /**
   * List entities by a specific status value.
   * Returns only entities matching the given status (e.g. ACTIVE, ARCHIVED).
   */
  async listByStatus<T extends { id: string }>(
    entityType: string,
    status: string
  ): Promise<T[]> {
    const table = this.toTableName(entityType);
    const db = getPowerSyncDatabase();
    const result = await db.execute(
      `SELECT * FROM ${table} WHERE org_id = ? AND status = ? ORDER BY name`,
      [getOrganizationId(), status]
    );
    const rows = result?.result || [];
    return rows.map((row: any) => this.toResource<T>(entityType, row));
  }

  /**
   * List archived/cancelled entities of a type.
   * Uses the appropriate status field per entity type.
   */
  async listArchived<T extends { id: string }>(
    entityType: string,
    query?: ResourceQuery
  ): Promise<ResourceResult<T>> {
    const table = this.toTableName(entityType);
    const db = getPowerSyncDatabase();

    // Determine the archive status based on entity type
    const isEvent = entityType === 'Event';
    const archiveStatus = isEvent ? 'CANCELLED' : 'ARCHIVED';

    const conditions = ['org_id = ?', `status = ?`];
    const params = [getOrganizationId(), archiveStatus];

    // Apply additional filters from query
    if (query?.filter) {
      for (const f of query.filter) {
        const paramIndex = params.length;
        conditions.push(`${f.field} = ?`);
        params.push(f.value);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Execute query
    const sql = `SELECT * FROM ${table} ${whereClause}`;
    const result = await db.execute(sql, params);
    const rows = result?.result || [];

    const items = rows.map((row: any) => this.toResource<T>(entityType, row));

    return {
      items,
      total: items.length,
      hasNext: false,
    };
  }

  /**
   * Check if an entity exists.
   */
  async exists(entityType: string, id: string): Promise<boolean> {
    const table = this.toTableName(entityType);
    const db = getPowerSyncDatabase();
    const result = await db.execute(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return (result?.result?.length || 0) > 0;
  }

  /**
   * Convert entity type to database table name.
   */
  private toTableName(entityType: string): string {
    const tableMap: Record<string, string> = {
      Group: 'groups',
      Event: 'events',
      Member: 'members',
      Account: 'accounts',
      Category: 'categories',
      Role: 'org_units',
    };
    return tableMap[entityType] ?? entityType.toLowerCase();
  }

  /**
   * Convert database row to typed resource.
   * Applies snake_case to camelCase transformation.
   */
  private toResource<T>(entityType: string, row: any): T {
    const camelRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = this.toCamelCase(key);
      camelRow[camelKey] = value;
    }
    return camelRow as T;
  }

  /**
   * Convert snake_case to camelCase.
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

/** Singleton instance */
export const resource = new ResourceService();
