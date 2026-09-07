import type { OrgUnit, Group } from '@/types';

/**
 * OrgUnitAdapter — bridge between legacy OrgUnit and canonical Group
 *
 * The UI still references `OrgUnit`, but the canonical model uses `Group`.
 * This adapter maps between the two without changing the UI layer.
 */
export class OrgUnitAdapter {
  /** Convert a canonical Group to the legacy OrgUnit shape */
  static fromGroup(group: Group): OrgUnit {
    return {
      id: group.id,
      name: group.name,
      type: 'groupe',
      description: '',
      orgId: group.orgId,
      isActive: group.status === 'ACTIVE',
    };
  }

  /** Convert legacy OrgUnit to canonical Group shape (partial) */
  static toGroup(orgUnit: OrgUnit): Partial<Group> {
    return {
      name: orgUnit.name,
      parentGroupId: null,
      responsableMemberId: null,
      status: orgUnit.isActive ? 'ACTIVE' : 'ARCHIVED',
    };
  }

  /** Map a list of groups to org units */
  static mapGroupsToOrgUnits(groups: Group[]): OrgUnit[] {
    return groups.map(this.fromGroup);
  }
}
