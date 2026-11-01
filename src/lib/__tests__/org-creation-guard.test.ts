// @vitest-environment node
/**
 * Garde anti-doublon à la création d'organisation (P0 — blocage de synchro).
 *
 * NON-VACUITÉ : ces tests ÉCHOUENT si la décision `decideExistingRootOrg`
 * n'existe pas / ne bloque pas. Chaque assertion cible une branche du correctif :
 *   - compte avec org réelle (profil ou miroir) → `blocked: true` ;
 *   - compte sans org (`__no_org__`, sentinelles, tableau vide) → `blocked: false`
 *     (le self-serve NEUF doit pouvoir créer sa première org) ;
 *   - org ARCHIVED neutralisée → `blocked: false` (soft-delete, on repart) ;
 *   - miroir indisponible (`null`) → repli sur le profil.
 */
import { describe, it, expect } from "vitest";
import {
  decideExistingRootOrg,
  isSentinelOrgId,
  NO_ORG_SENTINELS,
} from "@/lib/orgCreationGuard";

describe("isSentinelOrgId", () => {
  it("reconnaît les marqueurs « aucune organisation »", () => {
    for (const s of NO_ORG_SENTINELS) expect(isSentinelOrgId(s)).toBe(true);
    expect(isSentinelOrgId("")).toBe(true);
    expect(isSentinelOrgId(null)).toBe(true);
    expect(isSentinelOrgId(undefined)).toBe(true);
    expect(isSentinelOrgId("   ")).toBe(true);
  });

  it("une organisation réelle n'est pas une sentinelle", () => {
    expect(isSentinelOrgId("org-abc")).toBe(false);
    expect(isSentinelOrgId("org-central")).toBe(false);
  });
});

describe("decideExistingRootOrg", () => {
  it("bloque quand le profil est rattaché à une org réelle (miroir indisponible)", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "org-abc",
      profileName: "Église A",
      orgs: null,
    });
    expect(d.blocked).toBe(true);
    expect(d.org).toEqual({ id: "org-abc", name: "Église A" });
  });

  it("bloque quand le miroir liste une org réelle (même si le profil est sentinelle)", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "__no_org__",
      orgs: [{ orgId: "org-xyz", name: "Org X", status: "ACTIVE" }],
    });
    expect(d.blocked).toBe(true);
    expect(d.org).toEqual({ id: "org-xyz", name: "Org X" });
  });

  it("préfère l'org du profil quand elle figure dans le miroir", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "org-b",
      orgs: [
        { orgId: "org-a", name: "A", status: "ACTIVE" },
        { orgId: "org-b", name: "B", status: "ACTIVE" },
      ],
    });
    expect(d.blocked).toBe(true);
    expect(d.org?.id).toBe("org-b");
  });

  it("NE bloque PAS un compte neuf sans organisation (self-serve)", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "__no_org__",
      orgs: [],
    });
    expect(d.blocked).toBe(false);
    expect(d.org).toBeNull();
  });

  it("NE bloque PAS quand le profil est sentinelle et le miroir vide", () => {
    const d = decideExistingRootOrg({ profileOrgId: "no-org", orgs: [] });
    expect(d.blocked).toBe(false);
  });

  it("neutralise une org ARCHIVED (soft-delete → on peut repartir)", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "org-gone",
      orgs: [{ orgId: "org-gone", name: "Ancienne", status: "ARCHIVED" }],
    });
    expect(d.blocked).toBe(false);
    expect(d.org).toBeNull();
  });

  it("reste bloquant si au moins une org reste exploitable", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "__no_org__",
      orgs: [
        { orgId: "org-old", name: "Archivée", status: "ARCHIVED" },
        { orgId: "org-live", name: "Active", status: "ACTIVE" },
      ],
    });
    expect(d.blocked).toBe(true);
    expect(d.org?.id).toBe("org-live");
  });

  it("ignore les sentinelles présentes dans le miroir", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "__no_org__",
      orgs: [
        { orgId: "__no_org__", name: "Sentinel", status: "ACTIVE" },
        { orgId: "no-org", name: "Sentinel", status: "ACTIVE" },
      ],
    });
    expect(d.blocked).toBe(false);
  });

  it("traite un id d'org réel (ex. org-1 d'un ancien run) comme une organisation", () => {
    const d = decideExistingRootOrg({
      profileOrgId: "org-1",
      orgs: [{ orgId: "org-1", name: "Lumina", status: "ACTIVE" }],
    });
    expect(d.blocked).toBe(true);
    expect(d.org?.id).toBe("org-1");
  });
});
