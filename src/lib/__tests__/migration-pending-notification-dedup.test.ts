/**
 * Migrations — garde anti-doublon du trigger PENDING (R-I) et anti-bug de
 * montant (R-J).
 *
 * DÉFAUT (mesuré en production, 2026-11-04) : deux triggers AFTER INSERT
 * tiraient sur `transactions` quand `status='PENDING'` —
 * `on_transaction_change` (TRANSACTION_SUBMITTED, montant /100) ET
 * `on_transaction_pending` (TRANSACTION_PENDING, montant BRUT en centimes).
 * Résultat : une notification en double par transaction, dont une au montant
 * 100× trop grand.
 *
 * Cette garde rejoue l'état final des migrations (CREATE vs DROP) et exige :
 *   1. le trigger `on_transaction_pending` est ABSENT à l'état final ;
 *   2. la fonction `create_pending_transaction_notification` est ABSENTE à
 *      l'état final ;
 *   3. `notify_transaction_change` (le journal canonique) couvre bien le cas
 *      INSERT PENDING avec un montant divisé par 100.
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

/** État final du trigger `on_transaction_pending` (true = présent). */
function pendingTriggerPresent(): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (/DROP\s+TRIGGER\s+IF\s+EXISTS\s+on_transaction_pending/i.test(sql)) present = false;
    if (/CREATE\s+TRIGGER\s+on_transaction_pending/i.test(sql)) present = true;
  }
  return present;
}

/** État final de la fonction `create_pending_transaction_notification`. */
function pendingFunctionPresent(): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (/DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.create_pending_transaction_notification/i.test(sql)) {
      present = false;
    }
    if (/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.create_pending_transaction_notification/i.test(sql)) {
      present = true;
    }
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

describe("migrations — pas de trigger PENDING redondant (R-I)", () => {
  it("`on_transaction_pending` est supprimé à l'état final", () => {
    expect(pendingTriggerPresent()).toBe(false);
  });

  it("`create_pending_transaction_notification` est supprimée à l'état final", () => {
    expect(pendingFunctionPresent()).toBe(false);
  });
});

describe("migrations — montant de notification PENDING correct (R-J)", () => {
  it("`notify_transaction_change` divise le montant par 100 et formate", () => {
    const sql = latestDefinitionOf("notify_transaction_change");
    expect(sql).not.toBe("");
    expect(sql).toMatch(/NEW\.amount\s*\/\s*100/);
    expect(sql).toMatch(/to_char\(/);
    // Le cas INSERT PENDING doit produire TRANSACTION_SUBMITTED.
    expect(sql).toMatch(/TG_OP = 'INSERT' AND NEW\.status = 'PENDING'/);
  });
});
