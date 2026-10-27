/**
 * Chantier B — modèle de capacités : couverture + projection par rôle.
 *
 * Invariant central : le vocabulaire de capacités ne perd AUCUNE permission du
 * modèle canon (`PERMISSION_MATRIX`). Sinon une permission resterait
 * inaccessible à l'écran d'administration.
 *
 * Run with: npx vitest run src/lib/__tests__/capabilities.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSION_MATRIX, type Permission } from "@/lib/rbac";
import {
  CAPABILITIES,
  capabilitiesForRole,
  capabilityById,
  capabilityFullyGranted,
  capabilityGrantPayload,
  permissionsOfCapability,
} from "@/lib/capabilities";
import type { Role } from "@/types";

const ALL_PERMISSIONS: Permission[] = Array.from(
  new Set(Object.values(PERMISSION_MATRIX).flat()),
);

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("modèle de capacités", () => {
  it("(a) toute permission de PERMISSION_MATRIX est couverte par ≥ 1 capacité", () => {
    const covered = new Set(CAPABILITIES.flatMap((cap) => cap.permissions));
    const missing = ALL_PERMISSIONS.filter((p) => !covered.has(p));
    expect(missing, `permissions non couvertes : ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("(a bis) aucune capacité n'invente une permission hors du vocabulaire de rbac.ts", () => {
    // Le vocabulaire canon est le type `Permission` de `src/lib/rbac.ts` — PAS
    // seulement l'union de PERMISSION_MATRIX : `member:delete` est déclarée
    // dans le type mais n'est détenue par aucun rôle (capacité accordable par
    // grant). On lit la source pour verrouiller l'anti-dérive, comme
    // `role-model-drift.test.ts`.
    const source = readFileSync(
      resolve(__dirname, "../rbac.ts"),
      "utf8",
    );
    const union = source.match(
      /export type Permission =([\s\S]*?);/,
    )?.[1];
    expect(union, "type Permission introuvable dans rbac.ts").toBeDefined();
    const vocabulary = new Set(
      [...(union as string).matchAll(/"([a-z]+:[a-z]+)"/g)].map((m) => m[1]),
    );
    for (const cap of CAPABILITIES) {
      for (const permission of cap.permissions) {
        expect(
          vocabulary.has(permission),
          `${cap.id} → ${permission}`,
        ).toBe(true);
      }
    }
  });

  it("les identifiants de capacités sont uniques", () => {
    const ids = CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("(b) TREASURIER détient finance.manage + invitations.manage, PAS admin.roles", () => {
    const ids = capabilitiesForRole("TREASURIER").map((c) => c.id);
    expect(ids).toContain("finance.manage");
    expect(ids).toContain("invitations.manage");
    expect(ids).not.toContain("admin.roles");
  });

  it("(c) MEMBRE ne détient QUE finance.view et events.view", () => {
    const ids = capabilitiesForRole("MEMBRE").map((c) => c.id);
    expect(ids.sort()).toEqual(["events.view", "finance.view"]);
  });

  it("(c bis) capabilitiesForRole suit l'ordre de CAPABILITIES", () => {
    const ids = capabilitiesForRole("PASTEUR_PRINCIPAL").map((c) => c.id);
    const expectedOrder = CAPABILITIES.map((c) => c.id).filter((id) =>
      ids.includes(id),
    );
    expect(ids).toEqual(expectedOrder);
  });

  it("capabilityFullyGranted exige TOUTES les permissions", () => {
    const financeManage = capabilityById("finance.manage")!;
    // TREASURIER n'a PAS transaction:reject → pas « pleinement » accordée.
    expect(capabilityFullyGranted(financeManage, "TREASURIER")).toBe(false);
    // PASTEUR_PRINCIPAL détient toutes les permissions de finance.manage.
    expect(capabilityFullyGranted(financeManage, "PASTEUR_PRINCIPAL")).toBe(true);
  });

  it("(d) capabilityGrantPayload produit des paires resource:action uniques", () => {
    for (const cap of CAPABILITIES) {
      const pairs = capabilityGrantPayload(cap);
      const keys = pairs.map((p) => `${p.resource}:${p.action}`);
      expect(new Set(keys).size, `capacité ${cap.id}`).toBe(keys.length);
      // Chaque paire correspond à une permission déclarée.
      expect(keys.sort()).toEqual([...cap.permissions].sort());
      // Aucune paire vide.
      for (const p of pairs) {
        expect(p.resource.length).toBeGreaterThan(0);
        expect(p.action.length).toBeGreaterThan(0);
      }
    }
  });

  it("(e) permissionsOfCapability cohérent avec CAPABILITIES", () => {
    for (const cap of CAPABILITIES) {
      expect(permissionsOfCapability(cap.id)).toEqual(cap.permissions);
      expect(capabilityById(cap.id)).toEqual(cap);
    }
    expect(permissionsOfCapability("inexistant.xyz")).toEqual([]);
    expect(capabilityById("inexistant.xyz")).toBeUndefined();
  });

  it("chaque rôle a une projection de capacités non vide", () => {
    for (const role of Object.keys(PERMISSION_MATRIX) as Role[]) {
      expect(capabilitiesForRole(role).length, role).toBeGreaterThan(0);
    }
  });
});
