// @vitest-environment node
/**
 * Garde R173 — `has_permission` : la branche `group_member` doit être liée au
 * DEMANDEUR (`mm.id = p_uid`), sinon une autorisation ciblant un membership de
 * groupe s'applique à TOUS les membres de l'organisation (élévation
 * horizontale).
 *
 * Défaut latent au moment du correctif : table `grants` vide, `group_memberships`
 * vide, aucun `members.id` ne correspond à un profil → aucun chemin exploitable.
 * Le défaut reste réel dès qu'un grant `group_member` est créé.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
const R173_FILE = "20261104000013_fix_has_permission_group_member.sql";
const r173 = readFileSync(resolve(migrationsDir, R173_FILE), "utf8");

describe("R173 — has_permission : branche group_member liée au demandeur", () => {
  it("lie le membership du groupe au demandeur (mm.id = p_uid)", () => {
    expect(r173).toMatch(/mm\.id\s*=\s*p_uid::text/);
    expect(r173).toMatch(/gm\.id::text\s*=\s*g\.subject_id/);
  });

  it("ne conserve PAS l'ancienne branche non liée (`subject_id IN (SELECT gm.id` sans mm.id)", () => {
    // L'ancien corps accordait le grant à tout membre de l'org.
    expect(r173).not.toMatch(/subject_id IN \(SELECT gm\.id/);
  });

  it("conserve la garde PREDICATE_UID_MISMATCH (R170)", () => {
    expect(r173).toMatch(/PREDICATE_UID_MISMATCH/);
    expect(r173).toMatch(/initplan_uid\(\)/);
  });

  it("reste réversible", () => {
    const rollback = readFileSync(
      resolve(migrationsDir, "rollback/20261104000013_rollback.sql"),
      "utf8",
    );
    expect(rollback).toMatch(/subject_id IN \(SELECT gm\.id/);
  });
});
