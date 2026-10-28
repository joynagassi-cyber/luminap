/**
 * PM15 — la récupération locale sûre ne doit plus être une capacité morte.
 *
 * Défaut visé : les primitives existaient (`disconnectPowerSync`,
 * `deleteAllLocalData`, `resetOrganizationId`) mais AUCUNE action utilisateur ne
 * les enchaînait. Ce test verrouille l'orchestration : ordre significatif,
 * best-effort, et câblage réel dans la page Health.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { performLocalRecovery, type LocalRecoveryDeps } from "../localRecovery";

function deps(overrides: Partial<LocalRecoveryDeps> = {}): {
  d: LocalRecoveryDeps;
  order: string[];
} {
  const order: string[] = [];
  const d: LocalRecoveryDeps = {
    disconnect: async () => {
      order.push("disconnect");
    },
    purgeLocalData: async () => {
      order.push("purge");
    },
    resetOrg: () => {
      order.push("reset-org");
    },
    reload: () => {
      order.push("reload");
    },
    ...overrides,
  };
  return { d, order };
}

describe("performLocalRecovery — ordre significatif", () => {
  it("exécute disconnect → purge → reset-org → reload, dans cet ordre", async () => {
    const { d, order } = deps();
    const res = await performLocalRecovery(d);
    expect(order).toEqual(["disconnect", "purge", "reset-org", "reload"]);
    expect(res.ok).toBe(true);
    expect(res.steps).toEqual(["disconnect", "purge", "reset-org", "reload"]);
  });

  it("la base est fermée AVANT la purge du stockage", async () => {
    const { d, order } = deps();
    await performLocalRecovery(d);
    expect(order.indexOf("disconnect")).toBeLessThan(order.indexOf("purge"));
  });
});

describe("performLocalRecovery — best-effort (jamais d'écran figé)", () => {
  it("une fermeture de base en échec n'empêche ni la purge ni le rechargement", async () => {
    const { d, order } = deps({
      disconnect: async () => {
        order.push("disconnect");
        throw new Error("SQLite busy");
      },
    });
    const res = await performLocalRecovery(d);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("disconnect");
    expect(order).toContain("purge");
    expect(order).toContain("reload");
  });

  it("une purge en échec n'empêche pas le rechargement", async () => {
    const { d, order } = deps({
      purgeLocalData: async () => {
        order.push("purge");
        throw new Error("quota");
      },
    });
    const res = await performLocalRecovery(d);
    expect(res.ok).toBe(false);
    expect(order).toContain("reload");
  });
});

describe("câblage réel dans la page Health (anti-régression : plus de capacité morte)", () => {
  const src = readFileSync(resolve(__dirname, "../../pages/Health.tsx"), "utf8");

  it("la page Health appelle performLocalRecovery", () => {
    expect(src).toMatch(/performLocalRecovery\(/);
  });

  it("elle câble les trois primitives réelles", () => {
    expect(src).toMatch(/disconnect:\s*\(\)\s*=>\s*disconnectPowerSync\(\)/);
    expect(src).toMatch(/purgeLocalData:\s*\(\)\s*=>\s*deleteAllLocalData\(\)/);
    expect(src).toMatch(/resetOrg:\s*\(\)\s*=>\s*resetOrganizationId\(\)/);
  });

  it("elle expose un bouton de récupération confirmé", () => {
    expect(src).toMatch(/data-testid="health\.local-recovery"/);
    expect(src).toMatch(/window\.confirm\(/);
  });
});
