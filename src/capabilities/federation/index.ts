/**
 * Federation Capability — multi-organization management
 *
 * Manages organizations, org units, and relationships between them.
 * Enables federated structures (e.g., church network, school district).
 */

export interface Organization {
  id: string;
  name: string;
  type: 'church' | 'school' | 'company' | 'ngo' | 'custom';
  parentId?: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  orgId: string;
  parentId?: string;
  type: string;
}

export class FederationService {
  private orgs: Map<string, Organization> = new Map();
  private units: Map<string, OrgUnit[]> = new Map();
  private templates: Map<string, string[]> = new Map();

  /** Create a new organization */
  async createOrg(config: Partial<Organization>): Promise<Organization> {
    const org: Organization = {
      id: config.id ?? `org-${Date.now()}`,
      name: config.name ?? 'Untitled',
      type: config.type ?? 'custom',
      parentId: config.parentId,
      config: config.config ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orgs.set(org.id, org);
    this.units.set(org.id, []);
    return org;
  }

  /** Get an organization by ID */
  async getOrg(id: string): Promise<Organization | null> {
    return this.orgs.get(id) ?? null;
  }

  /** List organizations with optional filters */
  async listOrgs(filter?: { type?: string; parentId?: string }): Promise<Organization[]> {
    let orgs = Array.from(this.orgs.values());
    if (filter?.type) {
      orgs = orgs.filter(o => o.type === filter.type);
    }
    if (filter?.parentId) {
      orgs = orgs.filter(o => o.parentId === filter.parentId);
    }
    return orgs;
  }

  /** Register a template for an organization */
  async registerTemplate(orgId: string, templateId: string): Promise<void> {
    const templates = this.templates.get(orgId) ?? [];
    if (!templates.includes(templateId)) {
      templates.push(templateId);
      this.templates.set(orgId, templates);
    }
  }

  /** Get templates for an organization */
  async getTemplates(orgId: string): Promise<string[]> {
    return this.templates.get(orgId) ?? [];
  }

  /** Add an org unit */
  addOrgUnit(unit: OrgUnit): void {
    const units = this.units.get(unit.orgId) ?? [];
    units.push(unit);
    this.units.set(unit.orgId, units);
  }

  /** Get org units for an organization */
  getOrgUnits(orgId: string): OrgUnit[] {
    return this.units.get(orgId) ?? [];
  }
}

/** Singleton instance */
export const federation = new FederationService();
