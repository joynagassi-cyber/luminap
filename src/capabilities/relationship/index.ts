/**
 * Relationship Capability — manage group memberships
 *
 * Universal pattern: any entity can have many-to-many relationships
 * through membership records. No domain-specific concepts.
 *
 * Usage:
 *   import { relationship } from '@/capabilities/relationship'
 *   const id = await relationship.addMembership(groupId, memberId, 'MEMBRE', actorId)
 *   await relationship.removeMembership(membershipId, actorId)
 *   const isMember = await relationship.isMember(groupId, memberId)
 */

import {
  addGroupMembershipPS,
  removeGroupMembershipPS,
  getGroupMembershipsPS,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";

/** Membership role */
export type MembershipRole = "MEMBRE" | "RESPONSABLE";

/** Membership record */
export interface Membership {
  id: string;
  groupId: string;
  memberId: string;
  role: MembershipRole;
  joinedAt: string;
  leftAt: string | null;
}

/**
 * Relationship service — manages group memberships via PowerSync.
 * Pure domain-agnostic membership logic.
 */
export class RelationshipService {
  /**
   * Add a member to a group.
   * Returns the membership id.
   */
  async addMembership(
    groupId: string,
    memberId: string,
    role: MembershipRole,
    _actorId: string,
  ): Promise<string> {
    return addGroupMembershipPS(groupId, memberId, role);
  }

  /**
   * Remove a member from a group.
   */
  async removeMembership(
    membershipId: string,
    _actorId: string,
  ): Promise<void> {
    await removeGroupMembershipPS(membershipId);
  }

  /**
   * Check if a member is already in a group.
   */
  /**
   * Check if a member belongs to a group.
   * NOTE: This is a subset of the full Relationship capability — currently limited to group_memberships.
   * Future: generalize to support any entity-to-entity relationship (Student->Class, Employee->Dept, etc.)
   */
  async isMember(groupId: string, memberId: string): Promise<boolean> {
    // Filter by org_id to ensure cross-org isolation
    const orgId = getOrganizationId();
    const memberships = await getGroupMembershipsPS();
    return memberships.some(
      (m: any) =>
        m.group_id === groupId &&
        m.member_id === memberId &&
        m.org_id === orgId,
    );
  }
}

/** Singleton instance */
export const relationship = new RelationshipService();
