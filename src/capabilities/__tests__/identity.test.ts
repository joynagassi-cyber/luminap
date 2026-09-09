import { describe, it, expect, beforeEach } from "vitest";
import {
  IdentityService,
  type IdentityProfile,
  type IdentityProfileUpdate,
} from "../identity";

describe("identity capability", () => {
  let identity: IdentityService;

  beforeEach(() => {
    identity = new IdentityService();
  });

  // ─── getProfile ────────────────────────────────────────────────

  describe("getProfile", () => {
    it("returns null for a non-existent user", () => {
      const profile = identity.getProfile("nonexistent");
      expect(profile).toBeNull();
    });

    it("returns the profile for an existing user", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      const profile = identity.getProfile("user-1");
      expect(profile).not.toBeNull();
      expect(profile!.id).toBe("user-1");
      expect(profile!.email).toBe("alice@example.com");
      expect(profile!.displayName).toBe("Alice");
    });

    it("returns a profile with metadata", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice", {
        role: "admin",
      });
      const profile = identity.getProfile("user-1");
      expect(profile!.metadata).toEqual({ role: "admin" });
    });
  });

  // ─── createProfile ─────────────────────────────────────────────

  describe("createProfile", () => {
    it("creates a new profile and returns it", () => {
      const profile = identity.createProfile(
        "user-1",
        "alice@example.com",
        "Alice",
      );
      expect(profile.id).toBe("user-1");
      expect(profile.email).toBe("alice@example.com");
      expect(profile.displayName).toBe("Alice");
      expect(profile.metadata).toEqual({});
    });

    it("returns the existing profile when called again with the same id", () => {
      const first = identity.createProfile(
        "user-1",
        "alice@example.com",
        "Alice",
      );
      const second = identity.createProfile(
        "user-1",
        "changed@example.com",
        "Changed",
      );
      expect(first).toBe(second);
      // original data is preserved
      expect(first.email).toBe("alice@example.com");
      expect(first.displayName).toBe("Alice");
    });

    it("accepts optional metadata", () => {
      const profile = identity.createProfile(
        "user-1",
        "alice@example.com",
        "Alice",
        { role: "admin", tier: "premium" },
      );
      expect(profile.metadata).toEqual({ role: "admin", tier: "premium" });
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────

  describe("updateProfile", () => {
    it("updates displayName", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      const updated = identity.updateProfile("user-1", {
        displayName: "Alice Smith",
      });
      expect(updated).not.toBeNull();
      expect(updated!.displayName).toBe("Alice Smith");
      expect(updated!.email).toBe("alice@example.com"); // unchanged
    });

    it("updates email", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      const updated = identity.updateProfile("user-1", {
        email: "newalice@example.com",
      });
      expect(updated).not.toBeNull();
      expect(updated!.email).toBe("newalice@example.com");
    });

    it("updates metadata", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice", {
        role: "admin",
      });
      const updated = identity.updateProfile("user-1", {
        metadata: { role: "viewer" },
      });
      expect(updated!.metadata).toEqual({ role: "viewer" });
    });

    it("returns null for a non-existent profile", () => {
      const result = identity.updateProfile("nonexistent", {
        displayName: "Nobody",
      });
      expect(result).toBeNull();
    });

    it("preserves existing fields when updating only one field", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice", {
        role: "admin",
      });
      const updated = identity.updateProfile("user-1", {
        displayName: "Alice Updated",
      });
      expect(updated!.email).toBe("alice@example.com");
      expect(updated!.metadata).toEqual({ role: "admin" });
    });

    it("merges metadata rather than replacing — no, it replaces per spec", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice", {
        role: "admin",
      });
      const updated = identity.updateProfile("user-1", {
        metadata: { tier: "premium" },
      });
      expect(updated!.metadata).toEqual({ tier: "premium" });
    });
  });

  // ─── deleteProfile ─────────────────────────────────────────────

  describe("deleteProfile", () => {
    it("returns true and removes the profile", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      const result = identity.deleteProfile("user-1");
      expect(result).toBe(true);
      expect(identity.getProfile("user-1")).toBeNull();
    });

    it("returns false for a non-existent profile", () => {
      const result = identity.deleteProfile("nonexistent");
      expect(result).toBe(false);
    });

    it("allows re-creation after deletion", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      identity.deleteProfile("user-1");
      const fresh = identity.createProfile(
        "user-1",
        "alice@example.com",
        "Alice",
      );
      expect(fresh.id).toBe("user-1");
    });
  });

  // ─── listProfiles ──────────────────────────────────────────────

  describe("listProfiles", () => {
    it("returns empty array when no profiles exist", () => {
      expect(identity.listProfiles()).toEqual([]);
    });

    it("returns all created profiles", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      identity.createProfile("user-2", "bob@example.com", "Bob");
      const profiles = identity.listProfiles();
      expect(profiles).toHaveLength(2);
    });
  });

  // ─── hasProfile ────────────────────────────────────────────────

  describe("hasProfile", () => {
    it("returns true for an existing profile", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      expect(identity.hasProfile("user-1")).toBe(true);
    });

    it("returns false for a non-existent profile", () => {
      expect(identity.hasProfile("user-1")).toBe(false);
    });
  });

  // ─── contract verification ─────────────────────────────────────

  describe("IdentityProfile contract", () => {
    it("has all required fields: id, email, displayName, metadata", () => {
      const profile: IdentityProfile = {
        id: "user-1",
        email: "alice@example.com",
        displayName: "Alice",
        metadata: {},
      };
      expect(profile.id).toBe("user-1");
      expect(profile.email).toBe("alice@example.com");
      expect(profile.displayName).toBe("Alice");
      expect(profile.metadata).toEqual({});
    });
  });

  describe("IdentityService contract", () => {
    it("exposes getProfile, updateProfile, deleteProfile", () => {
      expect(typeof identity.getProfile).toBe("function");
      expect(typeof identity.updateProfile).toBe("function");
      expect(typeof identity.deleteProfile).toBe("function");
    });
  });

  // ─── type safety ───────────────────────────────────────────────

  describe("IdentityProfileUpdate type", () => {
    it("accepts partial updates for each field", () => {
      // These are compile-time checks — runtime verify they work
      const updates1: IdentityProfileUpdate = { email: "x@x.com" };
      const updates2: IdentityProfileUpdate = { displayName: "Name" };
      const updates3: IdentityProfileUpdate = { metadata: { k: "v" } };
      expect(updates1.email).toBe("x@x.com");
      expect(updates2.displayName).toBe("Name");
      expect(updates3.metadata).toEqual({ k: "v" });
    });

    it("accepts an empty update", () => {
      identity.createProfile("user-1", "alice@example.com", "Alice");
      const updated = identity.updateProfile("user-1", {});
      expect(updated).not.toBeNull();
      // fields unchanged
      expect(updated!.email).toBe("alice@example.com");
    });
  });
});
