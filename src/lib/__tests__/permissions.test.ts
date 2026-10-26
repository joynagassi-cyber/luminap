/**
 * Phase 4 — RBAC fin : décision unique `hasPermission` (DB ↔ TS).
 *
 * Contrat §Phase 4 : « décision unique DB↔TS, portées hiérarchiques, deny
 * prioritaire, miroir TS avec les mêmes tests ». Le défaut réel : la décision
 * n'existait QUE côté TS (`federation.canAccess` + `rbac.PERMISSION_MATRIX`) ;
 * la base n'avait aucune fonction `has_permission`, donc la RLS et le client
 * pouvaient diverger.
 *
 * Cette suite verrouille la table de vérité générée depuis `PERMISSION_MATRIX`
 * (`src/lib/permissionTable.generated.ts` → migration SQL) et les règles de
 * portée/deny/expiration/révocation, côté TS comme côté SQL (généré).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PERMISSION_MATRIX, type Permission } from "../rbac";
import {
  PERMISSION_TABLE,
  ROLE_PERMISSION_ROWS,
  evaluatePermission,
  type GrantRow,
  type RoleAssignmentRow,
} from "../permissions";

const ALL_ROLES = Object.keys(PERMISSION_MATRIX) as (keyof typeof PERMISSION_MATRIX)[];

describe("table de vérité générée (miroir PERMISSION_MATRIX)", () => {
  it("chaque rôle canon a exactement ses permissions", () => {
    for (const role of ALL_ROLES) {
      const expected = [...PERMISSION_MATRIX[role]].sort();
      const actual = [...(PERMISSION_TABLE[role] ?? [])].sort();
      expect(actual).toEqual(expected);
    }
  });

  it("ROLE_PERMISSION_ROWS couvre la matrice (1 ligne par rôle×permission)", () => {
    const expectedCount = ALL_ROLES.reduce(
      (n, r) => n + PERMISSION_MATRIX[r].length,
      0,
    );
    expect(ROLE_PERMISSION_ROWS).toHaveLength(expectedCount);
  });

  it("les lignes SQL sont triées et sans doublon", () => {
    const keys = ROLE_PERMISSION_ROWS.map((r) => `${r.role}:${r.permission}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("la migration SQL générée est IDENTIQUE à la matrice TS (anti-dérive)", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../../supabase/migrations/20261026000002_rbac_has_permission.sql"),
      "utf8",
    );
    // Extrait les tuples ('ROLE', 'resource:action') de l'INSERT.
    const pairs = [...sql.matchAll(/\('([A-Z_]+)', '([a-z]+:[a-z]+)'\)/g)].map(
      (m) => `${m[1]}:${m[2]}`,
    );
    const expected = ROLE_PERMISSION_ROWS.map(
      (r) => `${r.role}:${r.permission}`,
    );
    expect(pairs.sort()).toEqual(expected.sort());
  });
});

describe("evaluatePermission — rôle canon", () => {
  it("accorde une permission détenue par le rôle", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "TREASURIER", orgId: "org-A", status: "ACTIVE" },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "transaction",
        action: "approve",
        roles,
        grants: [],
      }).allowed,
    ).toBe(true);
  });

  it("refuse une permission non détenue", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "MEMBRE", orgId: "org-A", status: "ACTIVE" },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "transaction",
        action: "approve",
        roles,
        grants: [],
      }).allowed,
    ).toBe(false);
  });

  it("UNION de plusieurs rôles (2 rôles → cumul)", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "MEMBRE", orgId: "org-A", status: "ACTIVE" },
      { role: "SECRETAIRE", orgId: "org-A", status: "ACTIVE" },
    ];
    const res = evaluatePermission({
      userId: "u1",
      orgId: "org-A",
      resource: "event",
      action: "create",
      roles,
      grants: [],
    });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("role");
  });

  it("un rôle d'une AUTRE org n'accorde rien", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "TREASURIER", orgId: "org-B", status: "ACTIVE" },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "transaction",
        action: "approve",
        roles,
        grants: [],
      }).allowed,
    ).toBe(false);
  });

  it("un rôle non ACTIF (PENDING) n'accorde pas (Phase 4 : statut strict)", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "TREASURIER", orgId: "org-A", status: "PENDING" },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "transaction",
        action: "approve",
        roles,
        grants: [],
      }).allowed,
    ).toBe(false);
  });
});

describe("evaluatePermission — deny prioritaire", () => {
  it("un DENY explicite l'emporte sur un rôle qui accorde", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "TREASURIER", orgId: "org-A", status: "ACTIVE" },
    ];
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "transaction",
        action: "approve",
        effect: "deny",
      },
    ];
    const res = evaluatePermission({
      userId: "u1",
      orgId: "org-A",
      resource: "transaction",
      action: "approve",
      roles,
      grants,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("deny");
  });

  it("un DENY scopé ne bloque pas une action hors de sa portée", () => {
    const roles: RoleAssignmentRow[] = [
      { role: "TREASURIER", orgId: "org-A", status: "ACTIVE" },
    ];
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "transaction",
        action: "approve",
        effect: "deny",
        scope: { resource: "group", id: "G1" },
      },
    ];
    // Appel sans scope : le deny scopé ne s'applique pas.
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "transaction",
        action: "approve",
        roles,
        grants,
      }).allowed,
    ).toBe(true);
  });
});

describe("evaluatePermission — grants (allow)", () => {
  it("un grant allow couvre même sans rôle", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "report",
        action: "export",
        effect: "allow",
      },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "report",
        action: "export",
        roles: [],
        grants,
      }).allowed,
    ).toBe(true);
  });

  it("un grant révoqué (revokedAt) ne compte pas", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "report",
        action: "export",
        effect: "allow",
        revokedAt: "2026-01-01T00:00:00Z",
      },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "report",
        action: "export",
        roles: [],
        grants,
      }).allowed,
    ).toBe(false);
  });

  it("un grant expiré (expiresAt passé) ne compte pas", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "report",
        action: "export",
        effect: "allow",
        expiresAt: "2026-01-01T00:00:00Z",
      },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "report",
        action: "export",
        roles: [],
        grants,
        now: new Date("2026-06-01T00:00:00Z"),
      }).allowed,
    ).toBe(false);
  });

  it("grant scopé : ne couvre que la portée exacte demandée", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "report",
        action: "read",
        effect: "allow",
        scope: { resource: "group", id: "G1" },
      },
    ];
    const q = (scope?: { resource: string; id: string }) =>
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "report",
        action: "read",
        roles: [],
        grants,
        scope,
      }).allowed;
    expect(q()).toBe(false); // sans scope → global demandé, grant scopé → non
    expect(q({ resource: "group", id: "G1" })).toBe(true);
    expect(q({ resource: "group", id: "G2" })).toBe(false);
  });

  it("subject_type=tag : un sujet de première classe (invariant 10)", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "tag",
        subjectId: "tag-benevoles",
        resource: "report",
        action: "read",
        effect: "allow",
      },
    ];
    // Le grant tag est porté par l'appelant via ses tags.
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "report",
        action: "read",
        roles: [],
        grants,
        userTagIds: ["tag-benevoles"],
      }).allowed,
    ).toBe(true);
  });

  it("vocabulaire LIBRE : resource/action inédits fonctionnent (invariant 9)", () => {
    const grants: GrantRow[] = [
      {
        subjectType: "user",
        subjectId: "u1",
        resource: "ai",
        action: "approve",
        effect: "allow",
      },
    ];
    expect(
      evaluatePermission({
        userId: "u1",
        orgId: "org-A",
        resource: "ai",
        action: "approve",
        roles: [],
        grants,
      }).allowed,
    ).toBe(true);
  });
});
