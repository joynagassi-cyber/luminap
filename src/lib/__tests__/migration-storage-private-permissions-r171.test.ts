// @vitest-environment node
/**
 * Garde R171 — permissions des BLOBS Storage alignées sur celles des MÉTADONNÉES.
 *
 * DÉFAUT : `archives` / `expense_proofs` n'exigeaient qu'`is_org_member` pour
 * INSERT et DELETE (héritage de 20261022000013, qui n'avait corrigé que l'axe
 * ORGANISATION), alors que les tables de métadonnées exigent une permission :
 *   • `transaction_attachments` → `has_permission(uid, org, 'transaction', 'update')`
 *   • `documents`               → `has_permission(uid, org, 'admin', 'settings')`
 * ⇒ un simple `MEMBRE` pouvait supprimer/écraser les justificatifs de dépense et
 * les archives de son organisation (perte de preuves financières).
 *
 * Cette garde verrouille :
 *   1. la suppression des policies génériques `lumina_private_write/delete` ;
 *   2. les policies par bucket avec la bonne permission (`admin`/`settings` pour
 *      archives, `transaction`/`update` pour expense_proofs) ;
 *   3. l'usage de `has_permission` (et non du seul `is_org_member`) ;
 *   4. la conservation de la lecture `is_org_member` (non restreinte) ;
 *   5. la réversibilité (rollback qui restaure les policies d'origine).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
const R171_FILE = "20261104000011_guard_storage_private_permissions.sql";
const r171 = readFileSync(resolve(migrationsDir, R171_FILE), "utf8");

describe("R171 — permissions des blobs Storage alignées sur les métadonnées", () => {
  it("retire les policies génériques is_org_member-only", () => {
    expect(r171).toMatch(/DROP POLICY IF EXISTS lumina_private_write ON storage\.objects/);
    expect(r171).toMatch(/DROP POLICY IF EXISTS lumina_private_delete ON storage\.objects/);
  });

  it("archives : écriture/suppression gardées par admin:settings", () => {
    expect(r171).toMatch(/CREATE POLICY lumina_archives_write ON storage\.objects/);
    expect(r171).toMatch(/CREATE POLICY lumina_archives_delete ON storage\.objects/);
    const adminSettings = r171.match(
      /has_permission\(\s*initplan_uid\(\),\s*\(storage\.foldername\(name\)\)\[1\],\s*'admin',\s*'settings'\)/g,
    );
    // archives write + delete
    expect(adminSettings?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("expense_proofs : écriture/suppression gardées par transaction:update", () => {
    expect(r171).toMatch(/CREATE POLICY lumina_expense_proofs_write ON storage\.objects/);
    expect(r171).toMatch(/CREATE POLICY lumina_expense_proofs_delete ON storage\.objects/);
    const txUpdate = r171.match(
      /has_permission\(\s*initplan_uid\(\),\s*\(storage\.foldername\(name\)\)\[1\],\s*'transaction',\s*'update'\)/g,
    );
    expect(txUpdate?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("conserve l'appartenance à l'organisation (is_org_member) en plus de la permission", () => {
    const memberChecks = r171.match(/is_org_member\(initplan_uid\(\), \(storage\.foldername\(name\)\)\[1\]\)/g);
    expect(memberChecks?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("ne restreint PAS la lecture (aucune nouvelle policy SELECT introduite)", () => {
    expect(r171).not.toMatch(/CREATE POLICY[^;]*FOR SELECT/i);
  });

  it("reste réversible (rollback restaure les policies génériques)", () => {
    const rollback = readFileSync(
      resolve(migrationsDir, "rollback/20261104000011_rollback.sql"),
      "utf8",
    );
    expect(rollback).toMatch(/CREATE POLICY lumina_private_write ON storage\.objects/);
    expect(rollback).toMatch(/CREATE POLICY lumina_private_delete ON storage\.objects/);
    expect(rollback).toMatch(/DROP POLICY IF EXISTS lumina_archives_write/);
    expect(rollback).toMatch(/DROP POLICY IF EXISTS lumina_expense_proofs_delete/);
  });
});
