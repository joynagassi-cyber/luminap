/**
 * Garde anti-dérive — modèle de rôles (R109 / R16).
 *
 * Verrouille les trois artefacts qui doivent rester alignés :
 *   1. `src/lib/rbac.ts` → `PERMISSION_MATRIX` (source de vérité TS, 14 rôles) ;
 *   2. la migration SQL générée `20261026000002_rbac_has_permission.sql`
 *      (miroir DB de la matrice) ;
 *   3. `docs/agent/role-model.json` (instantané MESURÉ, incluant l'écart ADMIN).
 *
 * Le défaut R109 : le rôle `ADMIN` existe dans les DONNÉES et les politiques
 * RLS (`profiles.role = 'ADMIN'`) mais est absent du modèle TS et de
 * `role_permissions` → le compte admin central n'a AUCUN droit via
 * `has_permission`. Ce test fige le modèle pour que tout ajout/retrait de rôle
 * soit explicite, et documente ADMIN tant qu'il n'est pas tranché.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { PERMISSION_MATRIX } from "@/lib/rbac";
import type { Role } from "@/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

const roleModel = JSON.parse(
  readFileSync(resolve(repoRoot, "docs/agent/role-model.json"), "utf8"),
) as {
  canon_roles: string[];
  role_permissions: Record<string, string[]>;
  db_only_roles: Record<string, { role_permissions_rows: number }>;
  policy_role_literals: string[];
};

const tsRoles = (Object.keys(PERMISSION_MATRIX) as Role[]).sort();

describe("R109 — modèle de rôles (anti-dérive TS ↔ DB)", () => {
  it("les rôles canon TS correspondent à l'instantané mesuré", () => {
    expect([...roleModel.canon_roles].sort()).toEqual(tsRoles);
  });

  it("la matrice TS correspond à l'instantané (rôle → permissions)", () => {
    for (const role of tsRoles) {
      expect([...PERMISSION_MATRIX[role]].sort(), `rôle ${role}`).toEqual(
        [...roleModel.role_permissions[role]].sort(),
      );
    }
  });

  it("la migration SQL générée est identique à la matrice TS", () => {
    const sql = readFileSync(
      resolve(repoRoot, "supabase/migrations/20261026000002_rbac_has_permission.sql"),
      "utf8",
    );
    const pairs = new Map<string, string[]>();
    for (const m of sql.matchAll(/\('([A-Z_]+)', '([a-z]+:[a-z]+)'\)/g)) {
      const list = pairs.get(m[1]) ?? [];
      list.push(m[2]);
      pairs.set(m[1], list);
    }
    for (const role of tsRoles) {
      expect([...(pairs.get(role) ?? [])].sort(), `SQL rôle ${role}`).toEqual(
        [...PERMISSION_MATRIX[role]].sort(),
      );
    }
  });

  it("`ADMIN` est le 15e rôle canonique, porteur de TOUTES les permissions (R109 tranché)", () => {
    // R109 a été TRANCHÉ (2026-10-29) : ADMIN fait partie du modèle canon et
    // détient toutes les permissions. L'invariant « ADMIN ⊇ tous les autres
    // rôles » garantit qu'aucune permission future ne sera oubliée pour ADMIN.
    expect(tsRoles).toContain("ADMIN");
    expect(roleModel.db_only_roles.ADMIN).toBeUndefined();

    const adminPerms = new Set(PERMISSION_MATRIX.ADMIN);
    const union = new Set(Object.values(PERMISSION_MATRIX).flat());
    for (const p of union) {
      expect(adminPerms.has(p), `ADMIN ne détient pas la permission ${p}`).toBe(
        true,
      );
    }
    // Toutes les permissions déclarées dans le type sont couvertes.
    expect(adminPerms.size).toBeGreaterThanOrEqual(union.size);
  });
});
