// @vitest-environment node
/**
 * Garde R164 — immuabilité d'une transaction APPROVED à l'UPDATE.
 *
 * CLASSE DE DÉFAUT (identique à R102, mais pour l'UPDATE) : la règle
 * « APPROVED = immuable » n'était appliquée que côté CLIENT
 * (`updateTransactionPS`) et, en base, UNIQUEMENT pour le DELETE
 * (`prevent_approved_transaction_delete`). Un UPDATE direct (PowerSync en
 * service_role contourne la RLS, ou l'API REST) modifiait donc une pièce
 * approuvée — altération silencieuse d'une comptabilité validée.
 *
 * Cette garde verrouille :
 *   1. la présence du trigger BEFORE UPDATE + de sa fonction ;
 *   2. le fait qu'il bloque TOUTE modification d'une ligne `OLD.status =
 *      'APPROVED'` (PIÈGE : une condition `NEW.status IS DISTINCT FROM
 *      'APPROVED'` laisserait passer une édition de MONTANT seul — régression
 *      exacte qui a motivé cette garde) ;
 *   3. le code d'erreur `23514` (classe 23) — le connecteur PowerSync ne jette
 *      que 22xxx/23xxx/42501 ; un `P0001` tomberait en retry infini.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

const R164_FILE = "20261104000007_guard_approved_transaction_update.sql";

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

const r164 = readFileSync(resolve(migrationsDir, R164_FILE), "utf8");

describe("R164 — garde d'immuabilité APPROVED à l'UPDATE (base)", () => {
  it("le trigger BEFORE UPDATE existe (état final présent)", () => {
    expect(triggerPresent("guard_approved_transaction_update")).toBe(true);
    expect(r164).toMatch(/CREATE TRIGGER guard_approved_transaction_update\b/);
    expect(r164).toMatch(/BEFORE UPDATE ON public\.transactions/);
  });

  it("bloque TOUTE modification d'une ligne déjà APPROVED", () => {
    expect(r164).toMatch(/OLD\.status = 'APPROVED'/);
    expect(r164).toMatch(/TRANSACTION_APPROVED_IMMUTABLE/);
  });

  it("NON-VACUITÉ : ne conditionne PAS le blocage à un CHANGEMENT de statut", () => {
    // Le piège : `NEW.status IS DISTINCT FROM 'APPROVED'` laisserait passer une
    // édition de montant/date sur une pièce approuvée (statut inchangé).
    expect(r164).not.toMatch(/NEW\.status IS DISTINCT FROM 'APPROVED'/);
  });

  it("utilise un code d'erreur de classe 23 (23514) que PowerSync jette (pas P0001)", () => {
    expect(r164).toMatch(/ERRCODE = '23514'/);
    expect(r164).not.toMatch(/ERRCODE = 'P0001'/);
  });

  it("reste réversible (fichier de rollback présent)", () => {
    const rollback = resolve(migrationsDir, "rollback/20261104000007_rollback.sql");
    const sql = readFileSync(rollback, "utf8");
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS guard_approved_transaction_update/);
  });
});
