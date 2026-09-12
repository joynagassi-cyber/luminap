/**
 * Federation Capability — multi-organization management
 *
 * Manages organizations in a hierarchical structure (parent → children).
 * Backed by the `organizations` table in Supabase with `parent_org_id`.
 *
 * Usage:
 *   import { federation } from '@/capabilities/federation'
 *   const children = await federation.getOrgChildren('org-dioce')
 *   await federation.createOrg('org-paroisse', 'Paroisse X', { parentOrgId: 'org-dioce' })
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { writeAudit } from "@/lib/audit";
import type { AuditEntry } from "@/types";

export interface FederationOrg {
  id: string;
  name: string;
  type: string;
  status: string;
  parentOrgId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  orgId: string;
  type: string;
}

class FederationService {
  /**
   * Create a new organization, optionally under a parent org.
   */
  async createOrg(
    id: string,
    name: string,
    opts: { parentOrgId?: string; type?: string } = {},
    actorId?: string,
  ): Promise<string> {
    const db = getPowerSyncDatabase();
    await db.execute(
      `INSERT INTO organizations (id, name, type, status, parent_org_id)
       VALUES (?, ?, ?, 'PENDING', ?)`,
      [id, name, opts.type ?? "CHURCH", opts.parentOrgId ?? null],
    );

    if (actorId) {
      await writeAudit({
        orgId: id,
        transactionId: null,
        userId: actorId,
        actorRoleAtTime: "CENTRAL_ADMIN",
        action: "CREATE",
        entityType: "Organization",
        entityId: id,
        beforeState: null,
        afterState: { id, name, type: opts.type ?? "CHURCH", status: "PENDING" },
        comment: `Organisation ${name} créée${opts.parentOrgId ? ` (enfant de ${opts.parentOrgId})` : ""}`,
      } as Omit<AuditEntry, "id" | "createdAt">);
    }

    return id;
  }

  /**
   * Get an organization by ID (with parent info).
   */
  async getOrg(id: string): Promise<FederationOrg | null> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE id = ?`,
      [id],
    );
    const row = res?.array?.[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      status: String(row.status),
      parentOrgId: row.parent_org_id ? String(row.parent_org_id) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  /**
   * List direct children of an organization.
   */
  async getOrgChildren(parentId: string): Promise<FederationOrg[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, status, parent_org_id, created_at, updated_at
       FROM organizations WHERE parent_org_id = ?`,
      [parentId],
    );
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      status: String(r.status),
      parentOrgId: String(r.parent_org_id),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  /**
   * Get the parent of an organization.
   */
  async getOrgParent(id: string): Promise<FederationOrg | null> {
    const org = await this.getOrg(id);
    if (!org || !org.parentOrgId) return null;
    return this.getOrg(org.parentOrgId);
  }

  /**
   * List all organizations visible to the user (managed via grants or membership).
   */
  async listOrgs(actorId: string, filter?: { type?: string }): Promise<FederationOrg[]> {
    const db = getPowerSyncDatabase();
    let sql = `SELECT DISTINCT o.id, o.name, o.type, o.status, o.parent_org_id, o.created_at, o.updated_at
       FROM organizations o
       WHERE EXISTS (
         SELECT 1 FROM org_admins WHERE org_admins.org_id = o.id
           AND org_admins.status = 'ACTIVE' AND org_admins.admin_profile_id = ?
       )
       OR EXISTS (
         SELECT 1 FROM profiles WHERE profiles.org_id = o.id AND profiles.id = ?
       )`;
    const params: any[] = [actorId, actorId];
    if (filter?.type) {
      sql += ` AND o.type = ?`;
      params.push(filter.type);
    }
    sql += ` ORDER BY o.created_at DESC`;
    const res = await db.execute(sql, params);
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      status: String(r.status),
      parentOrgId: r.parent_org_id ? String(r.parent_org_id) : null,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  }

  /**
   * Set a new parent for an organization (re-parent in the federation tree).
   */
  async setParentOrg(orgId: string, newParentId: string | null, actorId: string): Promise<void> {
    const db = getPowerSyncDatabase();
    await db.execute(
      `UPDATE organizations SET parent_org_id = ? WHERE id = ?`,
      [newParentId, orgId],
    );
    await writeAudit({
      orgId,
      transactionId: null,
      userId: actorId,
      actorRoleAtTime: "CENTRAL_ADMIN",
      action: "UPDATE",
      entityType: "Organization",
      entityId: orgId,
      beforeState: null,
      afterState: { parentOrgId: newParentId },
      comment: newParentId
        ? `Organisation ${orgId} rattachée à ${newParentId}`
        : `Organisation ${orgId} détachée de son parent`,
    } as Omit<AuditEntry, "id" | "createdAt">);
  }

  /**
   * List org units (local groups) within an organization.
   */
  async getOrgUnits(orgId: string): Promise<OrgUnit[]> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, org_id FROM org_units WHERE org_id = ?`,
      [orgId],
    );
    return (res?.array ?? []).map((r: any) => ({
      id: String(r.id),
      name: String(r.name),
      type: String(r.type),
      orgId: String(r.org_id),
    }));
  }
}

/** Singleton instance */
export const federation = new FederationService();
