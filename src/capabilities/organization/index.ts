/**
 * Organization Capability — manage organizational context
 *
 * Domain-agnostic organization management. Any system with multiple
 * organizations can use this capability to track org context and switch
 * between organizations.
 *
 * Usage:
 *   import { organization } from '@/capabilities/organization'
 *   const ctx = await organization.getContext()
 *   await organization.switchOrg('new-org-id')
 *   const units = await organization.getOrgUnits()
 *
 * Source of truth: all reads and writes go through PowerSync (see `central.ts`
 * for admin actions). There is a single PS-backed source — no in-memory
 * shadow copies. This closes audit signal O5.
 */

import { getOrganizationId, setOrganizationId } from "@/lib/orgContext";
import { getPowerSyncDatabase } from "@/lib/powersync";

/** Organization context — the current organization identity for the user */
export interface OrgContext {
  /** Organization identifier */
  orgId: string;
  /** Organization display name */
  orgName: string;
  /** User's role within the organization */
  role: string;
}

/** Organization unit — a sub-entity within an organization (dept, team, branch, etc.) */
export interface OrgUnit {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Unit type (e.g. "DEPARTMENT", "TEAM", "BRANCH") */
  type: string;
  /** Description */
  description: string;
  /** Parent unit id, if nested */
  parentId: string | null;
  /** Organization this unit belongs to */
  orgId: string;
  /** Whether the unit is active */
  isActive: boolean;
}

/**
 * Organization service — manages org context and organizational units.
 * Uses orgContext.ts for the current org ID source of truth.
 * All reads and writes are PS-backed (single source of truth, O5).
 */
export class OrganizationService {
  /**
   * Get the current organization context.
   * Uses getOrganizationId() as the source of truth for orgId.
   * Reads the org name from the `organizations` table; falls back to orgId.
   */
  async getContext(): Promise<OrgContext> {
    const orgId = getOrganizationId();
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT name FROM organizations WHERE id = ?`,
      [orgId],
    );
    const rows = (res?.array ?? []) as Array<{ name: string }>;
    const name = rows[0]?.name ?? orgId;
    return { orgId, orgName: name, role: "member" };
  }

  /**
   * Switch to a different organization.
   * Updates the org context via setOrganizationId().
   */
  async switchOrg(newOrgId: string): Promise<void> {
    setOrganizationId(newOrgId);
  }

  /**
   * Get all organization units for the current organization.
   * Returns an empty array if none exist.
   */
  async getOrgUnits(): Promise<OrgUnit[]> {
    const { orgId } = await this.getContext();
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name, type, org_id, description, is_active
       FROM org_units WHERE org_id = ? ORDER BY name`,
      [orgId],
    );
    const rows = (res?.array ?? []) as Array<{
      id: string;
      name: string;
      type: string;
      org_id: string;
      description: string;
      is_active: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type ?? "",
      description: r.description ?? "",
      parentId: null, // parentId lives in the groups table, not org_units
      orgId: r.org_id,
      isActive: !!r.is_active,
    }));
  }

  /**
   * Register (or re-register) an organization with a display name.
   * Upserts into the `organizations` table so the name is visible to all
   * consumers that read from PS.
   */
  async registerOrg(orgId: string, name: string): Promise<void> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();
    // Use INSERT … ON CONFLICT (id) to keep the SQL canonical and idempotent.
    await db.execute(
      `INSERT INTO organizations (id, name, type, status, created_at, updated_at)
       VALUES (?, ?, 'CHURCH', 'ACTIVE', ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
      [orgId, name, now, now],
    );
  }

  /**
   * Add an organization unit to the current org.
   * Writes directly to the `org_units` table via PowerSync.
   */
  async addOrgUnit(unit: OrgUnit): Promise<void> {
    const db = getPowerSyncDatabase();
    const now = new Date().toISOString();
    // org_units: id TEXT PK (supabase/migrations/0002). The PS schema in
    // src/lib/powersync/schema.ts omits id/description/is_active — align
    // that schema before relying on the full column set in production.
    await db.execute(
      `INSERT INTO org_units
         (id, name, type, org_id, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unit.id,
        unit.name,
        unit.type ?? "groupe",
        unit.orgId,
        unit.description ?? "",
        unit.isActive ? 1 : 0,
        now,
        now,
      ],
    );
  }

  /**
   * Remove an organization unit by id.
   * Deletes from `org_units` via PowerSync; returns true when a row was removed.
   */
  async removeOrgUnit(orgId: string, unitId: string): Promise<boolean> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `DELETE FROM org_units WHERE id = ? AND org_id = ?`,
      [unitId, orgId],
    );
    return (res?.rowsAffected ?? 0) > 0;
  }

  /**
   * List all registered organizations visible locally.
   */
  async listOrgs(): Promise<Array<{ orgId: string; name: string }>> {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      `SELECT id, name FROM organizations ORDER BY name`,
    );
    const rows = (res?.array ?? []) as Array<{ id: string; name: string }>;
    return rows.map((r) => ({ orgId: r.id, name: r.name }));
  }
}

/** Singleton instance */
export const organization = new OrganizationService();

// Les actions d'administration centrale vivent dans `./central` et sont
// importées directement depuis `@/capabilities/organization/central` (pas de
// re-export ici : ce module serait chargé — et donc `@/lib/audit` exécuté au
// module level — dès que n'importe qui importe `organization`, ce qui casse
// les tests qui mockent `@/lib/orgContext`).
