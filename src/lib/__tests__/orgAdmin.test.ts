/**
 * Chantier B — couche d'écriture admin : tests de la logique PURE.
 *
 * `orgAdmin` dépend de PowerSync (écriture réelle des memberships/grants), mais
 * toute la logique décisionnelle est extraite dans des fonctions pures :
 *   - `roleToMembershipWrite` : INSERT vs UPDATE du membership (contrainte
 *     UNIQUE (user_id, org_id, role)) ;
 *   - `buildGrantInputs`      : décomposition d'une capacité en grants, avec
 *     l'`org_id` de cloisonnement (chantier A) ;
 *   - `grantsToCapabilities`  : remontée grants → capacités.
 *
 * Aucun mock réseau, aucune DB : on teste ces fonctions directement.
 *
 * Run with: npx vitest run src/lib/__tests__/orgAdmin.test.ts
 */
import { describe, it, expect } from "vitest";
import {
  buildGrantInputs,
  grantsToCapabilities,
  roleToMembershipWrite,
  type MembershipRow,
} from "@/lib/orgAdmin";
import { capabilityById } from "@/lib/capabilities";

const USER = "user-1";
const ORG = "org-A";

describe("roleToMembershipWrite", () => {
  it("aucune ligne (user, org) → INSERT primaire", () => {
    expect(roleToMembershipWrite([], USER, ORG, "TREASURIER")).toEqual({
      kind: "insert",
      isPrimary: true,
    });
  });

  it("l'user a déjà une appartenance dans une AUTRE org → INSERT non primaire", () => {
    const existing: MembershipRow[] = [
      { id: "m-other", user_id: USER, org_id: "org-B", role: "MEMBRE", status: "ACTIVE" },
    ];
    expect(roleToMembershipWrite(existing, USER, ORG, "TREASURIER")).toEqual({
      kind: "insert",
      isPrimary: false,
    });
  });

  it("une ligne (user, org) existe → UPDATE de cette ligne (pas d'INSERT concurrent)", () => {
    const existing: MembershipRow[] = [
      { id: "m-1", user_id: USER, org_id: ORG, role: "MEMBRE", status: "ACTIVE" },
    ];
    expect(roleToMembershipWrite(existing, USER, ORG, "TREASURIER")).toEqual({
      kind: "update",
      id: "m-1",
    });
  });

  it("plusieurs lignes (user, org) → cible la ligne portant déjà le rôle visé", () => {
    const existing: MembershipRow[] = [
      { id: "m-old", user_id: USER, org_id: ORG, role: "MEMBRE", status: "ARCHIVED" },
      { id: "m-target", user_id: USER, org_id: ORG, role: "TREASURIER", status: "PENDING" },
    ];
    expect(roleToMembershipWrite(existing, USER, ORG, "TREASURIER")).toEqual({
      kind: "update",
      id: "m-target",
    });
  });

  it("aucune ligne au rôle visé → cible la ligne ACTIVE", () => {
    const existing: MembershipRow[] = [
      { id: "m-arch", user_id: USER, org_id: ORG, role: "MEMBRE", status: "ARCHIVED" },
      { id: "m-act", user_id: USER, org_id: ORG, role: "DIACRE", status: "ACTIVE" },
    ];
    expect(roleToMembershipWrite(existing, USER, ORG, "TREASURIER")).toEqual({
      kind: "update",
      id: "m-act",
    });
  });

  it("ignore les appartenances des AUTRES utilisateurs", () => {
    const existing: MembershipRow[] = [
      { id: "m-other-user", user_id: "user-2", org_id: ORG, role: "MEMBRE", status: "ACTIVE" },
    ];
    expect(roleToMembershipWrite(existing, USER, ORG, "TREASURIER")).toEqual({
      kind: "insert",
      isPrimary: false,
    });
  });
});

describe("buildGrantInputs", () => {
  it("décompose une capacité en un grant par permission, org_id renseigné", () => {
    const cap = capabilityById("finance.view")!;
    const inputs = buildGrantInputs(USER, ORG, cap);
    expect(inputs).toHaveLength(2);
    expect(inputs.map((i) => `${i.resource}:${i.action}`).sort()).toEqual([
      "report:read",
      "transaction:read",
    ]);
    for (const input of inputs) {
      expect(input.org_id).toBe(ORG);
      expect(input.subject_type).toBe("user");
      expect(input.subject_id).toBe(USER);
      expect(input.scope_resource).toBeNull();
      expect(input.scope_id).toBeNull();
    }
  });

  it("produit des paires uniques (aucun grant dupliqué)", () => {
    const cap = capabilityById("finance.manage")!;
    const keys = buildGrantInputs(USER, ORG, cap).map(
      (i) => `${i.resource}:${i.action}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("grantsToCapabilities", () => {
  it("mappe un grant vers la capacité qui le contient", () => {
    const result = grantsToCapabilities([
      { id: "g1", resource: "invitation", action: "create", effect: "allow" },
    ]);
    expect(result).toContainEqual({
      grantId: "g1",
      capabilityId: "invitations.manage",
      effect: "allow",
    });
  });

  it("un grant peut alimenter plusieurs capacités (report:read)", () => {
    const result = grantsToCapabilities([
      { id: "g2", resource: "report", action: "read" },
    ]);
    const ids = result.map((r) => r.capabilityId).sort();
    expect(ids).toEqual(["finance.view", "reports.manage"]);
    // `effect` par défaut = allow.
    expect(result.every((r) => r.effect === "allow")).toBe(true);
  });

  it("respecte un deny explicite", () => {
    const result = grantsToCapabilities([
      { id: "g3", resource: "transaction", action: "approve", effect: "deny" },
    ]);
    expect(result).toEqual([
      { grantId: "g3", capabilityId: "finance.manage", effect: "deny" },
    ]);
  });

  it("ignore un grant dont resource:action n'appartient à aucune capacité", () => {
    expect(
      grantsToCapabilities([{ id: "g4", resource: "inconnu", action: "zzz" }]),
    ).toEqual([]);
  });

  it("déduplique (grantId, capabilityId, effect) répétés", () => {
    const result = grantsToCapabilities([
      { id: "g5", resource: "report", action: "read" },
      { id: "g5", resource: "report", action: "read" },
    ]);
    const keys = result.map((r) => `${r.grantId}|${r.capabilityId}|${r.effect}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
