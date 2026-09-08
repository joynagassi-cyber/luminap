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
 */

import { getOrganizationId, setOrganizationId } from '@/lib/orgContext';

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
  /** Parent unit id, if nested */
  parentId: string | null;
  /** Organization this unit belongs to */
  orgId: string;
}

/**
 * Organization service — manages org context and organizational units.
 * Uses orgContext.ts for the current org ID source of truth.
 */
export class OrganizationService {
  /**
   * In-memory store for organization units, keyed by orgId.
   * In production, this would query a database.
   */
  private _orgUnits: Map<string, OrgUnit[]> = new Map();

  /**
   * In-memory store for organization metadata (name, etc.).
   */
  private _orgMeta: Map<string, { name: string }> = new Map();

  /**
   * Get the current organization context.
   * Uses getOrganizationId() as the source of truth for orgId.
   * Returns a context with default values if metadata is not set.
   */
  getContext(): OrgContext {
    const orgId = getOrganizationId();
    const meta = this._orgMeta.get(orgId);
    return {
      orgId,
      orgName: meta?.name ?? orgId,
      role: 'member',
    };
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
    const { orgId } = this.getContext();
    return this._orgUnits.get(orgId) ?? [];
  }

  /**
   * Register an organization with a display name.
   */
  registerOrg(orgId: string, name: string): void {
    this._orgMeta.set(orgId, { name });
  }

  /**
   * Add an organization unit.
   */
  addOrgUnit(unit: OrgUnit): void {
    const orgId = unit.orgId;
    const units = this._orgUnits.get(orgId) ?? [];
    units.push(unit);
    this._orgUnits.set(orgId, units);
  }

  /**
   * Remove an organization unit by id.
   * Returns true if the unit was found and removed.
   */
  removeOrgUnit(orgId: string, unitId: string): boolean {
    const units = this._orgUnits.get(orgId);
    if (!units) return false;
    const idx = units.findIndex(u => u.id === unitId);
    if (idx === -1) return false;
    units.splice(idx, 1);
    this._orgUnits.set(orgId, units);
    return true;
  }

  /**
   * List all registered organizations.
   */
  listOrgs(): Array<{ orgId: string; name: string }> {
    return Array.from(this._orgMeta.entries()).map(([orgId, meta]) => ({
      orgId,
      name: meta.name,
    }));
  }
}

/** Singleton instance */
export const organization = new OrganizationService();
