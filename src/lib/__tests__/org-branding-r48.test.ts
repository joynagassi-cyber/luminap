// @vitest-environment jsdom
/**
 * Garde R48 — persistance PARTAGÉE de l'identité d'organisation (nom + logo).
 *
 * DÉFAUT : le logo (et le nom) n'existaient que dans `lumina-config`
 * (localStorage). Un autre membre, un autre appareil et les rapports PDF ne
 * voyaient jamais la personnalisation.
 *
 * Couvre : (1) l'hydratation depuis la ligne `organizations` synchronisée,
 * (2) l'écriture unifiée `setOrganizationBrandingPS`, (3) l'anti-dérive
 * schéma client / sync-config (la colonne doit exister des deux côtés).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const h = vi.hoisted(() => ({
  exec: vi.fn(async () => ({ rowsAffected: 1 })),
  getOptional: vi.fn(async () => null as unknown),
  orgId: "org-1",
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: h.exec, getOptional: h.getOptional }),
  getPowerSyncConnector: () => ({}),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
  ON_DEMAND_STREAMS: [],
}));
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => h.orgId,
  hasResolvedOrganization: () => true,
  setOrganizationId: vi.fn(),
  resetOrganizationId: vi.fn(),
  subscribeOrganization: () => () => {},
}));
vi.mock("@/lib/cache", () => ({
  get: async () => null,
  set: async () => {},
  invalidate: () => {},
  clear: () => {},
  asyncGetOrSet: async () => null,
}));
vi.mock("@/store/useLocalStore", () => {
  const fn = (() => ({})) as unknown as {
    (): Record<string, unknown>;
    getState: () => Record<string, unknown>;
    setState: () => void;
  };
  fn.getState = () => ({});
  fn.setState = () => {};
  return { useLocalStore: fn };
});
vi.mock("@/lib/auth", () => ({
  authService: {
    getState: () => ({ profile: { id: "u1", role: "ADMIN", org_id: "org-1" } }),
    subscribe: () => () => {},
    getSession: async () => null,
    getProfile: async () => null,
  },
}));

import {
  hydrateOrgBrandingFromDb,
  setOrganizationBrandingPS,
} from "@/lib/dataLayer";

const CONFIG_KEY = "lumina-config";

beforeEach(() => {
  localStorage.clear();
  h.exec.mockClear();
  h.getOptional.mockReset();
  h.orgId = "org-1";
});
afterEach(() => localStorage.clear());

describe("R48 — hydratation de l'identité d'organisation depuis la base", () => {
  it("remplit nom ET logo absents du cache local", async () => {
    h.getOptional.mockResolvedValue({ name: "Église DB", logo_url: "https://cdn/logo.png" });
    const changed = await hydrateOrgBrandingFromDb();
    expect(changed).toBe(true);
    const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY)!);
    expect(cfg.churchName).toBe("Église DB");
    expect(cfg.churchLogoUrl).toBe("https://cdn/logo.png");
  });

  it("NE remplace PAS une saisie locale (hors-ligne non montée en base)", async () => {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ churchName: "Local", churchLogoUrl: "data:image/png;base64,x", userPhoto: "" }),
    );
    h.getOptional.mockResolvedValue({ name: "Église DB", logo_url: "https://cdn/logo.png" });
    const changed = await hydrateOrgBrandingFromDb();
    expect(changed).toBe(false);
    const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY)!);
    expect(cfg.churchName).toBe("Local");
    expect(cfg.churchLogoUrl).toBe("data:image/png;base64,x");
  });

  it("ne fait rien si la ligne d'organisation est absente", async () => {
    h.getOptional.mockResolvedValue(null);
    expect(await hydrateOrgBrandingFromDb()).toBe(false);
    expect(localStorage.getItem(CONFIG_KEY)).toBeNull();
  });
});

describe("R48 — écriture unifiée (nom + logo)", () => {
  it("setOrganizationBrandingPS écrit logo_url quand un logo est fourni", async () => {
    await setOrganizationBrandingPS("org-1", { name: "N", logoUrl: "https://cdn/l.png" });
    const [sql, params] = h.exec.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toMatch(/UPDATE organizations SET .*logo_url = \?/);
    expect(sql).toMatch(/name = \?/);
    expect(params).toContain("https://cdn/l.png");
    expect(params).toContain("N");
  });

  it("setOrganizationBrandingPS ne touche pas logo_url si absent (inchangé)", async () => {
    await setOrganizationBrandingPS("org-1", { name: "N" });
    const [sql] = h.exec.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).not.toMatch(/logo_url/);
    expect(sql).toMatch(/name = \?/);
  });
});

describe("R48 — anti-dérive schéma client / sync-config", () => {
  it("la colonne logo_url existe côté schéma client ET dans les streams org_*", () => {
    const schema = readFileSync(
      resolve(process.cwd(), "src/lib/powersync/org-admin-schema.ts"),
      "utf8",
    );
    expect(schema).toMatch(/logo_url:\s*column\.text/);

    const yaml = readFileSync(resolve(process.cwd(), "powersync/sync-config.yaml"), "utf8");
    // Les 3 streams d'organisation doivent projeter la colonne.
    expect((yaml.match(/logo_url/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
