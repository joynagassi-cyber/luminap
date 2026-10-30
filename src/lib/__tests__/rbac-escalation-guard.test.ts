// @vitest-environment node
/**
 * Garde anti-escalade de privilèges (substrat RBAC).
 *
 * Les défauts CRITIQUES ci-dessous ont été corrigés par les migrations
 * `20261022000010`–`20261022000014`. Aucune n'avait de garde anti-régression :
 * une migration future (ou un `CREATE OR REPLACE`) pouvait silencieusement
 * rouvrir la voie d'escalade.
 *
 * Invariants verrouillés ici (vérifiés en base le 2026-10-30) :
 *  1. `profiles.role` est IMMUABLE pour un client : trigger
 *     `guard_profile_role_immutable` (BEFORE UPDATE) →
 *     `42501 ROLE_IMMUTABLE`.
 *  2. Un profil créé par un client ne peut pas naître privilégié : trigger
 *     `guard_profile_role_insert` (BEFORE INSERT).
 *  3. `upsert_profile` (SECURITY DEFINER) refuse `p_role` sans
 *     `is_org_admin` → `42501 ROLE_NOT_ALLOWED` (sinon il contournerait le
 *     trigger ci-dessus, `current_user` y étant le propriétaire).
 *  4. `org_memberships` : INSERT/UPDATE gardés par `is_org_admin` (plus
 *     d'auto-adhésion ni d'auto-promotion) ; l'ancienne politique `om_all_merged`
 *     (auto-écriture) n'est jamais recréée.
 *
 * Même patron que `audit-append-only-guard.test.ts` : on lit les migrations,
 * sans dépendre d'une base.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");
const ROLLBACK_DIR = resolve(MIGRATIONS_DIR, "rollback");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigration(name: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, name), "utf8");
}

/** Dernière migration qui (re)définit `pattern` (regex), ou null. */
function lastMigrationMatching(pattern: RegExp): string | null {
  const hits = migrationFiles().filter((f) => pattern.test(readMigration(f)));
  return hits.length ? hits[hits.length - 1] : null;
}

describe("Garde anti-escalade — profiles.role immuable", () => {
  it("le trigger guard_profile_role_immutable (BEFORE UPDATE) existe", () => {
    const f = lastMigrationMatching(
      /FUNCTION public\.guard_profile_role_immutable\s*\(/i,
    );
    expect(f).not.toBeNull();
    const sql = readMigration(f!);
    expect(sql).toMatch(/ROLE_IMMUTABLE/);
    expect(sql).toMatch(
      /CREATE TRIGGER guard_profile_role_immutable[\s\S]*?BEFORE UPDATE ON public\.profiles/i,
    );
  });

  it("le trigger guard_profile_role_insert (BEFORE INSERT) existe", () => {
    const f = lastMigrationMatching(
      /FUNCTION public\.guard_profile_role_insert\s*\(/i,
    );
    expect(f).not.toBeNull();
    const sql = readMigration(f!);
    expect(sql).toMatch(
      /CREATE TRIGGER guard_profile_role_insert[\s\S]*?BEFORE INSERT ON public\.profiles/i,
    );
  });

  it("aucune migration tardive ne supprime un trigger de garde sans le recréer", () => {
    const files = migrationFiles();
    for (const trigger of [
      "guard_profile_role_immutable",
      "guard_profile_role_insert",
    ]) {
      const idx = files.indexOf(
        lastMigrationMatching(new RegExp(`CREATE TRIGGER ${trigger}`, "i"))!,
      );
      for (const f of files.slice(idx + 1)) {
        const sql = readMigration(f);
        const dropped = new RegExp(`DROP TRIGGER[^;]*${trigger}`, "i").test(sql);
        const recreated = new RegExp(
          `CREATE TRIGGER[^;]*${trigger}`,
          "i",
        ).test(sql);
        expect(
          dropped && !recreated,
          `${f} supprime ${trigger} sans le recréer`,
        ).toBe(false);
      }
    }
  });
});

describe("Garde anti-escalade — upsert_profile (SECURITY DEFINER)", () => {
  it("la DERNIÈRE définition de upsert_profile garde l'injection de p_role", () => {
    const f = lastMigrationMatching(
      /CREATE OR REPLACE FUNCTION public\.upsert_profile\s*\(/i,
    );
    expect(f).not.toBeNull();
    const sql = readMigration(f!);
    // Garde présente : refus si l'appelant n'est pas admin de l'org visée.
    expect(sql).toMatch(/is_org_admin\s*\(/i);
    expect(sql).toMatch(/ROLE_NOT_ALLOWED/);
    // Le corps ne doit pas écrire `role` sans passer par la garde.
    expect(sql).toMatch(/coalesce\(v_role,\s*profiles\.role\)/i);
  });

  it("aucune migration tardive ne réécrit upsert_profile sans la garde is_org_admin", () => {
    const files = migrationFiles();
    const idx = files.indexOf(
      lastMigrationMatching(
        /CREATE OR REPLACE FUNCTION public\.upsert_profile\s*\(/i,
      )!,
    );
    for (const f of files.slice(idx + 1)) {
      const sql = readMigration(f);
      const redefines =
        /CREATE OR REPLACE FUNCTION public\.upsert_profile\s*\(/i.test(sql);
      if (redefines) {
        expect(
          /is_org_admin\s*\(/i.test(sql),
          `${f} réécrit upsert_profile sans garde is_org_admin`,
        ).toBe(true);
      }
    }
  });
});

describe("Garde anti-escalade — org_memberships", () => {
  it("INSERT et UPDATE sont gardés par is_org_admin", () => {
    const f = lastMigrationMatching(/CREATE POLICY om_insert ON public\.org_memberships/i);
    expect(f).not.toBeNull();
    const sql = readMigration(f!);
    expect(sql).toMatch(
      /CREATE POLICY om_insert ON public\.org_memberships[\s\S]*?is_org_admin/i,
    );
    expect(sql).toMatch(
      /CREATE POLICY om_update ON public\.org_memberships[\s\S]*?is_org_admin/i,
    );
    // Plus d'auto-adhésion sur INSERT/UPDATE (self-branch interdite).
    const insertBlock = sql.match(
      /CREATE POLICY om_insert[\s\S]*?;/i,
    )?.[0] ?? "";
    expect(insertBlock).not.toMatch(/user_id\s*=\s*initplan_uid\(\)/i);
  });

  it("l'ancienne politique om_all_merged (auto-écriture) n'est jamais recréée", () => {
    const files = migrationFiles();
    const idx = files.indexOf(
      lastMigrationMatching(/DROP POLICY IF EXISTS om_all_merged/i)!,
    );
    expect(idx).toBeGreaterThan(-1);
    for (const f of files.slice(idx + 1)) {
      expect(
        /CREATE POLICY[^;]*om_all_merged/i.test(readMigration(f)),
        `${f} recrée la politique om_all_merged`,
      ).toBe(false);
    }
  });
});

describe("Garde anti-escalade — réversibilité", () => {
  it("chaque correctif possède un rollback", () => {
    for (const n of [
      "20261022000010_rollback.sql",
      "20261022000011_rollback.sql",
      "20261022000012_rollback.sql",
      "20261022000014_rollback.sql",
    ]) {
      expect(() => readFileSync(resolve(ROLLBACK_DIR, n), "utf8")).not.toThrow();
    }
  });
});
