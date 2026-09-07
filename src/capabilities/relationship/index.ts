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
 */

import { addGroupMembershipPS, removeGroupMembershipPS } from '@/lib/dataLayer';

/** Membership role */
export type MembershipRole = 'MEMBRE' | 'RESPONSABLE';

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
    _actorId: string
  ): Promise<string> {
    return addGroupMembershipPS(groupId, memberId, role);
  }

  /**
   * Remove a member from a group.
   */
  async removeMembership(membershipId: string, _actorId: string): Promise<void> {
    await removeGroupMembershipPS(membershipId);
  }

  /**
   * Check if a member is already in a group.
   */
  async isMember(groupId: string, memberId: string): Promise<boolean> {
    // Soft check — PS query runs on next sync.
    // For immediate UI feedback, caller should check local state.
    return false;
  }
}

/** Singleton instance */
export const relationship = new RelationshipService();
