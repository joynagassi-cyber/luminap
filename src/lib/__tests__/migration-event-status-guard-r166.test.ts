// @vitest-environment node
/**
 * Garde R166 — immuabilité du STATUT d'un événement terminal (COMPLETED/CANCELLED).
 *
 * CLASSE DE DÉFAUT (même famille que R102/R164 : garde CLIENT-only) : la règle
 * « COMPLETED/CANCELLED = terminal » n'était appliquée que côté client
 * (`eventStatusGuard`), la table `events` n'ayant aucun trigger de statut. Un
 * UPDATE direct (PowerSync en service_role contourne la RLS, ou l'API REST)
 * ré-ouvrait un événement annulé/terminé.
 *
 * Cette garde verrouille :
 *   1. la présence du trigger BEFORE UPDATE + de sa fonction ;
 *   2. le fait qu'il couvre LES DEUX statuts terminaux et ne bloque QUE le
 *      CHANGEMENT de statut (les autres colonnes restent modifiables — portée
 *      minimale, miroir exact de la garde client) ;
 *   3. le code d'erreur `23514` (classe 23) que le connecteur PowerSync jette ;
 *      un `P0001` tomberait en retry infini.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

const R166_FILE = "20261104000008_guard_event_status_terminal.sql";

function migrationsInOrder(): { name: string; sql: string }[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(resolve(migrationsDir, name), "utf8") }));
}

/** État final d'un trigger (true = présent) sur `events`. */
function triggerPresent(name: string): boolean {
  let present = false;
  for (const { sql } of migrationsInOrder()) {
    if (new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${name}\\b`, "i").test(sql)) present = false;
    if (new RegExp(`CREATE\\s+TRIGGER\\s+${name}\\b`, "i").test(sql)) present = true;
  }
  return present;
}

const r166 = readFileSync(resolve(migrationsDir, R166_FILE), "utf8");

describe("R166 — garde d'immuabilité du statut d'un événement terminal (base)", () => {
  it("le trigger BEFORE UPDATE existe (état final présent)", () => {
    expect(triggerPresent("guard_event_status_terminal")).toBe(true);
    expect(r166).toMatch(/CREATE TRIGGER guard_event_status_terminal\b/);
    expect(r166).toMatch(/BEFORE UPDATE ON public\.events/);
  });

  it("couvre LES DEUX statuts terminaux", () => {
    expect(r166).toMatch(/OLD\.status IN \('COMPLETED',\s*'CANCELLED'\)/);
  });

  it("ne bloque QUE le changement de statut (autres colonnes modifiables)", () => {
    // Miroir exact de `eventStatusGuard` : seul un CHANGEMENT de statut depuis
    // un état terminal est refusé ; une édition de nom/budget reste permise.
    expect(r166).toMatch(/NEW\.status IS DISTINCT FROM OLD\.status/);
  });

  it("utilise un code d'erreur de classe 23 (23514) que PowerSync jette (pas P0001)", () => {
    expect(r166).toMatch(/ERRCODE = '23514'/);
    expect(r166).not.toMatch(/ERRCODE = 'P0001'/);
  });

  it("reste réversible (fichier de rollback présent)", () => {
    const rollback = resolve(migrationsDir, "rollback/20261104000008_rollback.sql");
    const sql = readFileSync(rollback, "utf8");
    expect(sql).toMatch(/DROP TRIGGER IF EXISTS guard_event_status_terminal/);
  });
});
