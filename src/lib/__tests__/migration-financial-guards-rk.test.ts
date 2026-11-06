/**
 * Migrations — gardes R-L (notification APPROVED en double) et R-K
 * (garde-fous financiers en base).
 *
 * R-L — DÉFAUT prouvé en production (2026-11-04) : deux triggers AFTER
 * produisaient la notification `TRANSACTION_APPROVED` à l'approbation
 * (`on_transaction_change` + `on_transaction_approved`) ; et
 * `notify_transaction_change` émettait `TRANSACTION_APPROVED` sur TOUT UPDATE
 * d'une transaction déjà approuvée (pas seulement la transition). État final
 * attendu : `on_transaction_approved` et sa fonction supprimés ; la branche
 * APPROVED exige une TRANSITION réelle.
 *
 * R-K — les contrôles financiers (maker-checker, gel de période) n'étaient
 * appliqués que côté client. État final attendu : un trigger BEFORE INSERT OR
 * UPDATE sur `transactions` applique le gel de période (date ≤ clôture) et
 * l'anti auto-approbation sur la transition vers APPROVED, de façon fail-open.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function migrationsInOrder(): { name: string; sql: string }[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(resolve(migrationsDir, name), "utf8") }));
}

/** État final d'un trigger (true = présent) sur `transactions`. */
function triggerPresent(name: string): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${name}\\b`, "i").test(sql)) present = false;
    if (new RegExp(`CREATE\\s+TRIGGER\\s+${name}\\b`, "i").test(sql)) present = true;
  }
  return present;
}

/** État final d'une fonction (true = présente). */
function functionPresent(name: string): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (new RegExp(`DROP\\s+FUNCTION\\s+IF\\s+EXISTS\\s+public\\.${name}\\b`, "i").test(sql)) present = false;
    if (new RegExp(`CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+public\\.${name}\\b`, "i").test(sql)) present = true;
  }
  return present;
}

function latestDefinitionOf(fnName: string): string {
  let last = "";
  for (const { sql } of migrationsInOrder()) {
    if (new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fnName}\\b`).test(sql)) last = sql;
  }
  return last;
}

describe("R-L — plus de notification APPROVED en double", () => {
  it("le trigger `on_transaction_approved` est supprimé à l'état final", () => {
    expect(triggerPresent("on_transaction_approved")).toBe(false);
  });

  it("la fonction `create_approved_transaction_notification` est supprimée", () => {
    expect(functionPresent("create_approved_transaction_notification")).toBe(false);
  });

  it("`notify_transaction_change` n'émet APPROVED que sur la TRANSITION", () => {
    const sql = latestDefinitionOf("notify_transaction_change");
    expect(sql).not.toBe("");
    expect(sql).toMatch(
      /TG_OP = 'UPDATE' AND NEW\.status = 'APPROVED' AND OLD\.status IS DISTINCT FROM 'APPROVED'/,
    );
  });
});

describe("R-K — garde-fous financiers en base", () => {
  const fn = latestDefinitionOf("enforce_transaction_financial_guards");

  it("le trigger BEFORE INSERT OR UPDATE existe à l'état final", () => {
    expect(triggerPresent("trg_transactions_financial_guards")).toBe(true);
    const last = migrationsInOrder().filter((m) => /trg_transactions_financial_guards/.test(m.sql)).pop();
    expect(last?.sql).toMatch(/BEFORE INSERT OR UPDATE ON public\.transactions/);
  });

  it("applique le gel de période (date ≤ clôture → PERIOD_LOCKED)", () => {
    expect(fn).not.toBe("");
    expect(fn).toMatch(/period_locked_until/);
    expect(fn).toMatch(/RAISE EXCEPTION 'PERIOD_LOCKED'/);
  });

  it("applique l'anti auto-approbation sur la transition APPROVED", () => {
    expect(fn).toMatch(/maker_checker_enabled/);
    expect(fn).toMatch(/RAISE EXCEPTION 'MAKER_CHECKER_SELF_APPROVAL'/);
    expect(fn).toMatch(/NEW\.approved_by_id = NEW\.created_by_id/);
    // Uniquement sur la transition (pas sur l'INSERT auto-approuvé).
    expect(fn).toMatch(/TG_OP = 'UPDATE'[\s\S]*?NEW\.status = 'APPROVED'[\s\S]*?OLD\.status IS DISTINCT FROM 'APPROVED'/);
  });

  it("utilise un code FATAL pour le client PowerSync (23xxx, pas P0001)", () => {
    // Sinon l'op serait retentée à l'infini et bloquerait la file d'upload.
    expect(fn).toMatch(/ERRCODE = '23514'/);
    expect(fn).not.toMatch(/ERRCODE = 'P0001'/);
  });

  it("est fail-open et n'affecte pas le rôle de réplication (auth.uid() NULL)", () => {
    expect(fn).toMatch(/v_uid\s+uuid\s*:=\s*auth\.uid\(\)/);
    expect(fn).toMatch(/IF v_uid IS NOT NULL/);
    // Réglage absent ⇒ aucun blocage : aucune RAISE hors des gardes de valeur.
    expect(fn).toMatch(/v_setting IS NOT NULL AND trim\(v_setting\) <> ''/);
  });

  it("les rollbacks existent pour les deux migrations", () => {
    for (const rb of [
      "rollback/20261104000003_rollback.sql",
      "rollback/20261104000004_rollback.sql",
    ]) {
      expect(() => readFileSync(resolve(migrationsDir, rb), "utf8")).not.toThrow();
    }
  });
});
