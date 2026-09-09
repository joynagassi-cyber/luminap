/**
 * Identity Capability — manage user profiles
 *
 * Domain-agnostic identity management. Any system with users can use
 * this capability to store and retrieve profile data.
 *
 * Usage:
 *   import { identity } from '@/capabilities/identity'
 *   const profile = await identity.getProfile(userId)
 *   await identity.updateProfile(userId, { displayName: 'Jane Doe' })
 *   await identity.deleteProfile(userId)
 */

/** User profile record */
export interface IdentityProfile {
  /** Unique identifier for the identity */
  id: string;
  /** User's email address */
  email: string;
  /** Display name for the user */
  displayName: string;
  /** Arbitrary key-value metadata for extensibility */
  metadata: Record<string, unknown>;
}

/** Partial profile used for updates */
export type IdentityProfileUpdate = Partial<
  Pick<IdentityProfile, "email" | "displayName" | "metadata">
>;

/**
 * Identity service — in-memory store for user profiles.
 * Pure domain-agnostic identity management.
 */
export class IdentityService {
  private profiles: Map<string, IdentityProfile> = new Map();

  /**
   * Get a profile by user id.
   * Returns null if not found.
   */
  getProfile(userId: string): IdentityProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  /**
   * Create a new profile if one does not exist.
   * Returns the created profile.
   */
  createProfile(
    userId: string,
    email: string,
    displayName: string,
    metadata?: Record<string, unknown>,
  ): IdentityProfile {
    const existing = this.profiles.get(userId);
    if (existing) {
      return existing;
    }
    const profile: IdentityProfile = {
      id: userId,
      email,
      displayName,
      metadata: metadata ?? {},
    };
    this.profiles.set(userId, profile);
    return profile;
  }

  /**
   * Update fields on an existing profile.
   * Returns the updated profile, or null if the profile does not exist.
   */
  updateProfile(
    userId: string,
    updates: IdentityProfileUpdate,
  ): IdentityProfile | null {
    const existing = this.profiles.get(userId);
    if (!existing) {
      return null;
    }
    const updated: IdentityProfile = {
      ...existing,
      ...(updates.email !== undefined ? { email: updates.email } : {}),
      ...(updates.displayName !== undefined
        ? { displayName: updates.displayName }
        : {}),
      ...(updates.metadata !== undefined ? { metadata: updates.metadata } : {}),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  /**
   * Delete a profile by user id.
   * Returns true if the profile existed and was deleted, false otherwise.
   */
  deleteProfile(userId: string): boolean {
    return this.profiles.delete(userId);
  }

  /**
   * List all profiles.
   */
  listProfiles(): IdentityProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Check if a profile exists.
   */
  hasProfile(userId: string): boolean {
    return this.profiles.has(userId);
  }
}

/** Singleton instance */
export const identity = new IdentityService();
