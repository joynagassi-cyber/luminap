/**
 * Tests for src/lib/auth.ts, onboardingState.ts, cache.ts, organization-context.ts
 *
 * Mocks:
 *  - @supabase/supabase-js : createClient() → fake client with
 *    auth.{signInWithPassword, signUp, getSession, getUser, refreshSession,
 *    signOut, signInWithOAuth, exchangeCodeForSession, onAuthStateChange},
 *    from("profiles").select/.update, rpc("upsert_profile")
 *  - @capacitor/core : Capacitor.isNativePlatform() => false
 *  - @/lib/dataLayer : canAccessOrganization / listUserOrgs stubs
 *  - global.localStorage : Map-based in-memory shim (node env)
 *  - process.env : stubbed via vi.hoisted before auth.ts import (VITE_SUPABASE_URL/ANON_KEY)
 *
 * No source files are modified.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Stub process.env BEFORE auth.ts is imported ────────────────────────────
// auth.ts throws at module load if VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// are both missing. The expression `import.meta.env.VITE_X || process.env.VITE_X`
// is resolved at transform time; in the node test environment, the fallback
// `process.env` is the operative source. vi.hoisted runs before any import.
vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "stub-anon-key");
});

// ─── In-memory localStorage shim ────────────────────────────────────────────
// Node has no localStorage. Provide a Map-backed implementation so
// onboardingState tests (and organization-context's resolveCurrentUserId
// fallback) can read/write it.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}

// ─── Supabase mock (hoisted so vi.mock factory can reference it) ────────────
const sbStore = vi.hoisted(() => ({
  signInWithPasswordResult: {
    data: {
      session: { user: { id: "sb-user-1", email: "a@b.com" }, access_token: "at", refresh_token: "rt" },
      user: { id: "sb-user-1", email: "a@b.com", user_metadata: {} },
    } as any,
    error: null,
  },
  signUpResult: {
    data: { user: { id: "sb-new-1", email: "n@x.com", user_metadata: {} } },
    error: null,
  },
  getSessionResult: { data: { session: null }, error: null },
  getUserResult: { data: { user: { id: "sb-user-1" } }, error: null },
  refreshSessionResult: { error: null },
  signOutResult: { error: null },
  signInWithOAuthResult: { data: {}, error: null },
  exchangeCodeResult: {
    data: { session: { user: { id: "sb-user-1", email: "a@b.com" }, access_token: "at" } },
    error: null,
  },
  profileSelectResult: {
    data: {
      id: "sb-user-1", email: "a@b.com", first_name: "Ana", last_name: "B",
      role: "MEMBRE", org_id: "test-org",
      created_at: "2025-01-01", updated_at: "2025-01-01",
    },
    error: null,
  },
  rpcUpsertResult: {
    data: { id: "sb-user-1", email: "a@b.com", first_name: "Ana", last_name: "B", role: "MEMBRE", org_id: "test-org", created_at: "2025-01-01", updated_at: "2025-01-01" },
    error: null,
  },
  profileUpdateResult: { error: null },
  calls: {
    signInWithPassword: [] as any[],
    signUp: [] as any[],
    getSession: [] as any[],
    getUser: [] as any[],
    refreshSession: [] as any[],
    signOut: [] as any[],
    signInWithOAuth: [] as any[],
    exchangeCodeForSession: [] as any[],
    onAuthStateChange: [] as any[],
    profileSelect: [] as any[],
    profileUpdate: [] as any[],
    rpc: [] as any[],
  },
  reset() {
    this.calls.signInWithPassword = [];
    this.calls.signUp = [];
    this.calls.getSession = [];
    this.calls.getUser = [];
    this.calls.refreshSession = [];
    this.calls.signOut = [];
    this.calls.signInWithOAuth = [];
    this.calls.exchangeCodeForSession = [];
    this.calls.onAuthStateChange = [];
    this.calls.profileSelect = [];
    this.calls.profileUpdate = [];
    this.calls.rpc = [];
  },
}));

vi.mock("@supabase/supabase-js", () => {
  function makeQuery() {
    return {
      select: vi.fn(function () {
        sbStore.calls.profileSelect.push("select");
        return {
          eq: vi.fn(function () {
            return { single: vi.fn(async () => sbStore.profileSelectResult) };
          }),
          single: vi.fn(async () => sbStore.profileSelectResult),
        };
      }),
      update: vi.fn(function (payload: any) {
        sbStore.calls.profileUpdate.push(payload);
        return {
          eq: vi.fn(async () => sbStore.profileUpdateResult),
        };
      }),
    };
  }

  function makeRpc() {
    return {
      upsert_profile: vi.fn(async (args: any) => {
        sbStore.calls.rpc.push(args);
        return sbStore.rpcUpsertResult;
      }),
    };
  }

  function makeAuth() {
    const auth = {
      signInWithPassword: vi.fn(async (creds: any) => {
        sbStore.calls.signInWithPassword.push(creds);
        return sbStore.signInWithPasswordResult;
      }),
      signUp: vi.fn(async (payload: any) => {
        sbStore.calls.signUp.push(payload);
        return sbStore.signUpResult;
      }),
      getSession: vi.fn(async () => {
        sbStore.calls.getSession.push(1);
        return sbStore.getSessionResult;
      }),
      getUser: vi.fn(async () => {
        sbStore.calls.getUser.push(1);
        return sbStore.getUserResult;
      }),
      refreshSession: vi.fn(async (args: any) => {
        sbStore.calls.refreshSession.push(args);
        return sbStore.refreshSessionResult;
      }),
      signOut: vi.fn(async () => {
        sbStore.calls.signOut.push(1);
        return sbStore.signOutResult;
      }),
      signInWithOAuth: vi.fn(async (args: any) => {
        sbStore.calls.signInWithOAuth.push(args);
        return sbStore.signInWithOAuthResult;
      }),
      exchangeCodeForSession: vi.fn(async (code: any) => {
        sbStore.calls.exchangeCodeForSession.push(code);
        return sbStore.exchangeCodeResult;
      }),
      onAuthStateChange: vi.fn((cb: any) => {
        sbStore.calls.onAuthStateChange.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    };
    return auth;
  }

  const fakeClient = {
    auth: makeAuth(),
    from: vi.fn((table: string) => {
      if (table === "profiles") return makeQuery();
      return { select: vi.fn(), update: vi.fn() };
    }),
    rpc: vi.fn((fn: string) => {
      if (fn === "upsert_profile") return makeRpc().upsert_profile;
      return vi.fn(async () => ({ data: null, error: null }));
    }),
  };

  return { createClient: vi.fn(() => fakeClient) };
});

// ─── Capacitor mock ─────────────────────────────────────────────────────────
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

// ─── dataLayer mock (used by organization-context) ────────────────────────
const dlMock = vi.hoisted(() => ({
  canAccessOrganization: vi.fn(async () => true),
  listUserOrgs: vi.fn(async () => []),
}));
vi.mock("@/lib/dataLayer", () => ({
  canAccessOrganization: dlMock.canAccessOrganization,
  listUserOrgs: dlMock.listUserOrgs,
}));

// ─── Now import modules under test ──────────────────────────────────────────
import { authService } from "@/lib/auth";
import {
  loadOnboardingState,
  saveOnboardingState,
  completeOnboarding,
  needsOnboarding,
  resetOnboarding,
  defaultOnboardingState,
  LEGACY_ONBOARDED_KEY,
  LEGACY_ROLE_KEY,
} from "@/lib/onboardingState";
import * as cache from "@/lib/cache";
import {
  enterOrganization,
  exitToCentral,
  resolveCurrentUserId,
  CENTRAL_ORG_ID,
  currentContext,
} from "@/lib/organization-context";
import { getOrganizationId, setOrganizationId } from "@/lib/orgContext";

// ─── Test helpers ───────────────────────────────────────────────────────────
type AuthState = {
  session: any; user: any; profile: any;
  isLoading: boolean; error: string | null;
};
const getState = (): AuthState => (authService as any).getState();

function seedAuthSession(user: any = { id: "sb-user-1" }, profile: any = null) {
  (authService as any).setState({
    session: { user, access_token: "at" },
    user,
    profile,
    isLoading: false,
    error: null,
  });
}

function clearAuth() {
  (authService as any).setState({
    session: null, user: null, profile: null,
    isLoading: false, error: null,
  });
  (authService as any).sessionCheckTimer = null;
}

function clearOnboardingKeys() {
  localStorage.removeItem("lumina-onboarding");
  localStorage.removeItem(LEGACY_ONBOARDED_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);
  localStorage.removeItem("lumina-user");
}

beforeEach(() => {
  sbStore.reset();
  clearAuth();
  clearOnboardingKeys();
  cache.clear();
  dlMock.canAccessOrganization.mockClear();
  dlMock.listUserOrgs.mockClear();
  dlMock.canAccessOrganization.mockResolvedValue(true);
  dlMock.listUserOrgs.mockResolvedValue([]);
  setOrganizationId("test-org");
});

afterEach(() => {
  vi.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

describe("auth.ts — signInWithEmail", () => {
  it("rejects empty email", async () => {
    const res = await authService.signInWithEmail("", "password123");
    expect(res.error).toBe("Please enter a valid email address.");
    expect(sbStore.calls.signInWithPassword.length).toBe(0);
  });

  it("rejects malformed email", async () => {
    const res = await authService.signInWithEmail("not-an-email", "password123");
    expect(res.error).toBe("Please enter a valid email address.");
    expect(sbStore.calls.signInWithPassword.length).toBe(0);
  });

  it("rejects empty password", async () => {
    const res = await authService.signInWithEmail("a@b.com", "");
    expect(res.error).toBe("Password must be at least 8 characters long.");
    expect(sbStore.calls.signInWithPassword.length).toBe(0);
  });

  it("rejects short password", async () => {
    const res = await authService.signInWithEmail("a@b.com", "short");
    expect(res.error).toBe("Password must be at least 8 characters long.");
  });

  it("maps 'Invalid login credentials' error to friendly message", async () => {
    sbStore.signInWithPasswordResult = {
      data: null,
      error: { message: "Invalid login credentials" },
    };
    const res = await authService.signInWithEmail("a@b.com", "password123");
    expect(res.error).toBe("Invalid email or password.");
    expect(getState().error).toBe("Invalid email or password.");
  });

  it("maps 'Email not confirmed' error", async () => {
    sbStore.signInWithPasswordResult = {
      data: null,
      error: { message: "Email not confirmed" },
    };
    const res = await authService.signInWithEmail("a@b.com", "password123");
    expect(res.error).toBe("Please confirm your email address before signing in.");
  });

  it("maps 'Too many requests' error", async () => {
    sbStore.signInWithPasswordResult = {
      data: null,
      error: { message: "Too many requests" },
    };
    const res = await authService.signInWithEmail("a@b.com", "password123");
    expect(res.error).toBe("Too many login attempts. Please wait and try again.");
  });

  it("maps 'User not found' error", async () => {
    sbStore.signInWithPasswordResult = {
      data: null,
      error: { message: "User not found" },
    };
    const res = await authService.signInWithEmail("a@b.com", "password123");
    expect(res.error).toBe("No account found with this email address.");
  });

  it("on success: seeds state, calls ensureProfile, starts session validation", async () => {
    vi.useFakeTimers();
    sbStore.signInWithPasswordResult = {
      data: {
        session: { user: { id: "sb-user-1" }, access_token: "at" },
        user: { id: "sb-user-1", email: "a@b.com", user_metadata: {} },
      },
      error: null,
    };
    const res = await authService.signInWithEmail("a@b.com", "password123");
    expect(res.error).toBeNull();
    expect(getState().user?.id).toBe("sb-user-1");
    expect(getState().profile?.id).toBe("sb-user-1");
    // ensureProfile → getProfile → profiles select
    expect(sbStore.calls.profileSelect.length).toBeGreaterThan(0);
    // session validation timer fires within 60s (fake-timer advance)
    expect(getState().session).toBeTruthy();
    vi.advanceTimersByTime(61_000);
    vi.runAllTicks();
    // getSession called during validation tick
    expect(sbStore.calls.getSession.length).toBeGreaterThan(0);
  });
});

describe("auth.ts — signOut", () => {
  it("clears session/user/profile state even on success", async () => {
    seedAuthSession();
    const res = await authService.signOut();
    expect(res.error).toBeNull();
    expect(getState().session).toBeNull();
    expect(getState().user).toBeNull();
    expect(getState().profile).toBeNull();
    expect(sbStore.calls.signOut.length).toBe(1);
  });

  it("clears state even when supabase.signOut throws", async () => {
    seedAuthSession();
    sbStore.signOutResult = { error: { message: "boom" } };
    const res = await authService.signOut();
    expect(res.error).toBe("boom");
    expect(getState().session).toBeNull();
    expect(getState().user).toBeNull();
  });
});

describe("auth.ts — updateProfile", () => {
  it("rejects with 'No user logged in' when no session", async () => {
    clearAuth();
    const res = await authService.updateProfile({ first_name: "X" });
    expect(res.error).toBe("No user logged in");
  });

  it("rejects empty first_name", async () => {
    seedAuthSession();
    const res = await authService.updateProfile({ first_name: "   " });
    expect(res.error).toBe("First name cannot be empty.");
  });

  it("rejects invalid role", async () => {
    seedAuthSession();
    const res = await authService.updateProfile({ role: "SUPER_ADMIN" as any });
    expect(res.error).toBe("Invalid role specified.");
    expect(sbStore.calls.profileUpdate.length).toBe(0);
  });

  it("accepts a valid role and updates local state", async () => {
    seedAuthSession(undefined, {
      id: "sb-user-1", email: "a@b.com", first_name: "Old", last_name: "X",
      role: "MEMBRE", org_id: "test-org",
      created_at: "2025-01-01", updated_at: "2025-01-01",
    });
    const res = await authService.updateProfile({
      first_name: "New",
      role: "PASTEUR_PRINCIPAL" as any,
    });
    expect(res.error).toBeNull();
    expect(getState().profile?.first_name).toBe("New");
    expect(getState().profile?.role).toBe("PASTEUR_PRINCIPAL");
    expect(sbStore.calls.profileUpdate.length).toBe(1);
    expect(sbStore.calls.profileUpdate[0].role).toBe("PASTEUR_PRINCIPAL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING STATE
// ═══════════════════════════════════════════════════════════════════════════

describe("onboardingState.ts", () => {
  it("loadOnboardingState returns default when nothing stored", () => {
    const st = loadOnboardingState();
    expect(st).toEqual(defaultOnboardingState());
  });

  it("loadOnboardingState merges stored partial with defaults", () => {
    saveOnboardingState({ ...defaultOnboardingState(), screen: 3, branch: "member" });
    const st = loadOnboardingState();
    expect(st.screen).toBe(3);
    expect(st.branch).toBe("member");
    expect(st.org).toEqual(defaultOnboardingState().org);
  });

  it("loadOnboardingState handles corrupted JSON gracefully", () => {
    localStorage.setItem("lumina-onboarding", "{not json");
    const st = loadOnboardingState();
    expect(st).toEqual(defaultOnboardingState());
  });

  it("completeOnboarding sets lumina-onboarded=true and lumina-role when role present", () => {
    const st = { ...defaultOnboardingState(), role: "MEMBRE" };
    completeOnboarding(st);
    expect(localStorage.getItem(LEGACY_ONBOARDED_KEY)).toBe("true");
    expect(localStorage.getItem(LEGACY_ROLE_KEY)).toBe("MEMBRE");
    expect(loadOnboardingState().completed).toBe(true);
  });

  it("completeOnboarding without role sets lumina-onboarded but not lumina-role", () => {
    completeOnboarding(defaultOnboardingState());
    expect(localStorage.getItem(LEGACY_ONBOARDED_KEY)).toBe("true");
    expect(localStorage.getItem(LEGACY_ROLE_KEY)).toBeNull();
  });

  it("needsOnboarding is false when completed", () => {
    completeOnboarding({ ...defaultOnboardingState(), role: "ANCIEN" });
    expect(needsOnboarding()).toBe(false);
  });

  it("needsOnboarding is false when legacy flag + role are set", () => {
    localStorage.setItem(LEGACY_ONBOARDED_KEY, "true");
    localStorage.setItem(LEGACY_ROLE_KEY, "MEMBRE");
    expect(needsOnboarding()).toBe(false);
  });

  it("needsOnboarding is true when legacy flag set but role missing", () => {
    localStorage.setItem(LEGACY_ONBOARDED_KEY, "true");
    expect(needsOnboarding()).toBe(true);
  });

  it("needsOnboarding is true in a completely clean state", () => {
    expect(needsOnboarding()).toBe(true);
  });

  it("resetOnboarding clears the 3 keys", () => {
    completeOnboarding({ ...defaultOnboardingState(), role: "MEMBRE" });
    localStorage.setItem("lumina-onboarding", JSON.stringify({ screen: 1 }));
    resetOnboarding();
    expect(localStorage.getItem("lumina-onboarding")).toBeNull();
    expect(localStorage.getItem(LEGACY_ONBOARDED_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_ROLE_KEY)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════

describe("cache.ts", () => {
  it("get returns value before TTL expiry (io tier = 300s)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    cache.set("io:key", 42, { tier: "io" });
    vi.advanceTimersByTime(299_000);
    expect(cache.get("io:key")).toBe(42);
    vi.advanceTimersByTime(2_000);
    expect(cache.get("io:key")).toBeUndefined();
  });

  it("get returns value before TTL expiry (cpu tier = 60s)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    cache.set("cpu:key", "v", { tier: "cpu" });
    vi.advanceTimersByTime(59_000);
    expect(cache.get("cpu:key")).toBe("v");
    vi.advanceTimersByTime(2_000);
    expect(cache.get("cpu:key")).toBeUndefined();
  });

  it("expired get() deletes the entry (stats().size reflects deletion)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    cache.set("k1", 1, { tier: "cpu", ttlMs: 1_000 });
    cache.set("k2", 2, { tier: "cpu", ttlMs: 1_000 });
    vi.advanceTimersByTime(2_000);
    expect(cache.get("k1")).toBeUndefined();
    expect(cache.stats().size).toBe(1); // k2 still alive
    expect(cache.stats().entries).toContain("k2");
    vi.advanceTimersByTime(1_000);
    expect(cache.get("k2")).toBeUndefined();
    expect(cache.stats().size).toBe(0);
  });

  it("invalidate(prefix) removes only matching keys", () => {
    cache.set("users:1", "a");
    cache.set("users:2", "b");
    cache.set("orgs:1", "c");
    cache.invalidate("users:");
    expect(cache.get("users:1")).toBeUndefined();
    expect(cache.get("users:2")).toBeUndefined();
    expect(cache.get("orgs:1")).toBe("c");
    expect(cache.stats().size).toBe(1);
  });

  it("asyncGetOrSet calls factory on miss and caches on hit", async () => {
    const factory = vi.fn(async () => "fresh");
    const v1 = await cache.asyncGetOrSet("async-key", factory, { tier: "cpu" });
    expect(v1).toBe("fresh");
    expect(factory).toHaveBeenCalledTimes(1);
    const v2 = await cache.asyncGetOrSet("async-key", factory, { tier: "cpu" });
    expect(v2).toBe("fresh");
    expect(factory).toHaveBeenCalledTimes(1); // cached
  });

  it("asyncGetOrSet re-fetches after TTL expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T00:00:00Z"));
    const factory = vi.fn(async () => 1);
    await cache.asyncGetOrSet("ttl-key", factory, { ttlMs: 10_000 });
    vi.advanceTimersByTime(11_000);
    const factory2 = vi.fn(async () => 2);
    const v = await cache.asyncGetOrSet("ttl-key", factory2, { ttlMs: 10_000 });
    expect(v).toBe(2);
    expect(factory2).toHaveBeenCalledTimes(1);
  });

  it("stats().size reflects entry count", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.stats().size).toBe(2);
    cache.del("a");
    expect(cache.stats().size).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIZATION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

describe("organization-context.ts", () => {
  it("enterOrganization returns null when canAccessOrganization=false (no state change)", async () => {
    dlMock.canAccessOrganization.mockResolvedValueOnce(false);
    setOrganizationId("prev-org");
    const res = await enterOrganization("denied-org");
    expect(res).toBeNull();
    expect(getOrganizationId()).toBe("prev-org"); // unchanged
    expect(dlMock.canAccessOrganization).toHaveBeenCalledWith(expect.any(String), "denied-org");
  });

  it("enterOrganization returns null for empty orgId", async () => {
    const res = await enterOrganization("");
    expect(res).toBeNull();
    expect(dlMock.canAccessOrganization).not.toHaveBeenCalled();
  });

  it("enterOrganization on success sets mode=ORG + target org id", async () => {
    dlMock.canAccessOrganization.mockResolvedValue(true);
    const res = await enterOrganization("org-42");
    expect(res).not.toBeNull();
    expect(res!.mode).toBe("ORG");
    expect(res!.orgId).toBe("org-42");
    expect(getOrganizationId()).toBe("org-42");
    expect(dlMock.canAccessOrganization).toHaveBeenCalled();
  });

  it("exitToCentral resets to CENTRAL_ORG_ID", () => {
    setOrganizationId("some-org");
    const ctx = exitToCentral();
    expect(ctx.mode).toBe("CENTRAL");
    expect(ctx.orgId).toBe(CENTRAL_ORG_ID);
    expect(ctx.label).toBe("Administration centrale");
    expect(getOrganizationId()).toBe(CENTRAL_ORG_ID);
  });

  it("currentContext() reflects the live mode", async () => {
    dlMock.canAccessOrganization.mockResolvedValue(true);
    await enterOrganization("org-7");
    const orgCtx = currentContext();
    expect(orgCtx.mode).toBe("ORG");
    expect(orgCtx.orgId).toBe("org-7");

    const centralCtx = exitToCentral();
    expect(centralCtx.mode).toBe("CENTRAL");
    expect(centralCtx.orgId).toBe(CENTRAL_ORG_ID);
  });

  it("resolveCurrentUserId falls back to lumina-user localStorage", () => {
    clearAuth(); // no profile in auth state
    localStorage.setItem("lumina-user", JSON.stringify({ id: "ls-user-9" }));
    expect(resolveCurrentUserId()).toBe("ls-user-9");
  });

  it("resolveCurrentUserId prefers the live auth profile over localStorage", () => {
    seedAuthSession(undefined, { id: "profile-auth-1" } as any);
    localStorage.setItem("lumina-user", JSON.stringify({ id: "ls-user-9" }));
    expect(resolveCurrentUserId()).toBe("profile-auth-1");
  });

  it("resolveCurrentUserId returns '' when neither source is available", () => {
    clearAuth();
    clearOnboardingKeys();
    expect(resolveCurrentUserId()).toBe("");
  });
});
