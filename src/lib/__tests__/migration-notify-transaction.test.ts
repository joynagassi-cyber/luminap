/**
 * Migrations — garde d'intégrité du trigger `notify_transaction_change`.
 *
 * DÉFAUT R101 (réel, prouvé sur l'instance dev) : la fonction
 * `notify_transaction_change()` insérait dans `notifications` en listant
 * 6 colonnes (org_id, action_type, title, message, source_transaction_id,
 * created_at) mais ne fournissait que 5 valeurs — `message` manquait. Toute
 * écriture d'une transaction PENDING/APPROVED/REJECTED échouait en
 * `42601: INSERT has more target columns than expressions`. Le flux finance
 * était donc cassé au niveau base (aucune transaction ne pouvait être
 * soumise ni approuvée).
 *
 * Ce test lit la DERNIÈRE migration qui (re)définit la fonction et exige :
 *   1. la colonne `message` figure dans la liste d'insertion ET une valeur
 *      lui est fournie ;
 *   2. la fonction gère le cas DELETE sans référencer NEW (qui vaut NULL).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function latestDefinitionOf(fnName: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let last = "";
  for (const f of files) {
    const sql = readFileSync(resolve(migrationsDir, f), "utf8");
    if (
      new RegExp(
        `CREATE OR REPLACE FUNCTION public\\.${fnName}\\b`,
      ).test(sql)
    ) {
      last = sql;
    }
  }
  return last;
}

describe("migrations — notify_transaction_change insère bien `message`", () => {
  it("la dernière définition fournit `message` (6 colonnes = 6 valeurs)", () => {
    const sql = latestDefinitionOf("notify_transaction_change");
    expect(sql).not.toBe("");

    const insert = sql.match(
      /INSERT INTO public\.notifications\s*\(([^)]*)\)\s*VALUES\s*\(([\s\S]*?)\);/,
    );
    expect(insert, "INSERT INTO notifications introuvable").not.toBeNull();

    const columns = insert![1]
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    expect(columns).toContain("message");
    expect(columns).toContain("source_transaction_id");

    // Au moins autant de valeurs (séparées par des virgules de premier niveau)
    // que de colonnes : la régression R101 avait 6 colonnes / 5 valeurs.
    const valueBlock = insert![2];
    let depth = 0;
    let commas = 0;
    for (const ch of valueBlock) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) commas++;
    }
    expect(commas + 1).toBeGreaterThanOrEqual(columns.length);
  });

  it("gère DELETE sans s'appuyer sur NEW", () => {
    const sql = latestDefinitionOf("notify_transaction_change");
    // La branche DELETE doit utiliser OLD (NEW vaut NULL sur DELETE).
    expect(sql).toMatch(/TG_OP = 'DELETE'[\s\S]*?OLD\./);
    expect(sql).toMatch(/IF TG_OP = 'DELETE' THEN\s*RETURN OLD;/);
  });
});

describe("migrations — immuabilité APPROVED (R102)", () => {
  const guard = latestDefinitionOf("prevent_approved_transaction_delete");

  it("existe une garde BEFORE DELETE sur les transactions", () => {
    expect(guard).not.toBe("");
    expect(guard).toMatch(/BEFORE DELETE ON public\.transactions/);
  });

  it("refuse la suppression d'une transaction APPROVED (parité TS)", () => {
    expect(guard).toMatch(/OLD\.status = 'APPROVED'/);
    expect(guard).toMatch(/RAISE EXCEPTION 'TRANSACTION_APPROVED_IMMUTABLE'/);
  });

  it("le garde-fou client (deleteTransactionPS) porte le MÊME code d'erreur", () => {
    const dl = readFileSync(
      resolve(__dirname, "../../lib/dataLayer.ts"),
      "utf8",
    );
    expect(dl).toMatch(
      /deleteTransactionPS[\s\S]*?status === "APPROVED"[\s\S]*?TRANSACTION_APPROVED_IMMUTABLE/,
    );
  });
});
