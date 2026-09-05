import { db } from './db';
import { generateId } from './utils';
import type { AuditEntry } from '@/types';
import type { StoreName } from './db';

/**
 * AuditLogRepository
 * Système d'audit canonique: every mutation is logged with before/after snapshots and actorRoleAtTime.
 * Invariant NeverBreak #6: AuditLog sur toute mutation.
 */
export interface AuditLogRepository {
  write(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void>;
  list(filters?: {
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    action?: string;
    actorId?: string;
  }): Promise<AuditEntry[]>;
  getByEntity(entityType: string, entityId: string): Promise<AuditEntry[]>;
}

const defaultAuditEntry = {
  id: '',
  orgId: 'org-1',
  transactionId: null as string | null,
  userId: 'local-user',
  actorRoleAtTime: null as string | null,
  action: 'CREATE' as const,
  entityType: 'Transaction',
  entityId: '',
  beforeState: null as any,
  afterState: null as any,
  comment: null as string | null,
  createdAt: '',
};

export const auditLogRepo: AuditLogRepository = {
  async write(entry) {
    const now = new Date().toISOString();
    const fullEntry: AuditEntry = { ...defaultAuditEntry, ...entry, id: generateId(), createdAt: now };
    await db.put('auditEntries' as StoreName, fullEntry);
    return Promise.resolve();
  },

  async list(filters = {}) {
    const all = await db.getAll<any>('auditEntries' as StoreName).catch(() => [] as any[]);
    return all
      .filter((a: any) => {
        if (filters.entityType && a.entityType !== filters.entityType) return false;
        if (filters.entityId && a.entityId !== filters.entityId) return false;
        if (filters.startDate && a.createdAt < filters.startDate) return false;
        if (filters.endDate && a.createdAt > filters.endDate) return false;
        if (filters.action && a.action !== filters.action) return false;
        if (filters.actorId && a.userId !== filters.actorId) return false;
        return true;
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByEntity(entityType, entityId) {
    return this.list({ entityType, entityId });
  },
};

/**
 * Convenience function to write an audit entry from any Use Case.
 * Usage:
 *   await writeAudit({
 *     entityType: 'Transaction',
 *     entityId: tx.id,
 *     action: 'CREATE',
 *     actorId: userId,
 *     actorRoleAtTime: user.role,
 *     beforeState: null,
 *     afterState: tx,
 *   });
 */
export async function writeAudit(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<void> {
  await auditLogRepo.write(entry);
}

/**
 * Helper: write a summary audit entry (without full before/after state)
 */
export async function writeAuditSummary(options: {
  entityType: string;
  entityId: string;
  action: AuditEntry['action'];
  actorId: string;
  actorRoleAtTime?: string;
  comment?: string | null;
}): Promise<void> {
  await auditLogRepo.write({
    orgId: 'org-1',
    transactionId: null,
    userId: options.actorId,
    actorRoleAtTime: options.actorRoleAtTime ?? null,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId,
    beforeState: null,
    afterState: null,
    comment: options.comment ?? null,
  });
}
