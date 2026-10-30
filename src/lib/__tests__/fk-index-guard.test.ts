// @vitest-environment node
/**
 * Garde statique — les clés étrangères des tables listées ci-dessous DOIVENT
 * avoir un index COUVRANT en tête (mono-colonne ou préfixe exact).
 *
 * Défaut mesuré (advisor `unindexed_foreign_keys`, 2026-10-31) : les FK
 * `event_tasks.event_id` et `event_tasks.parent_task_id` n'étaient couvertes
 * que par des index COMPOSITES menant par `org_id` — inutilisables pour la
 * vérification de la contrainte FK (`WHERE event_id = …`). Correctif : migration
 * `20261031000005` (2 index mono-colonne).
 *
 * Patron : lecture des migrations (sans base). On vérifie qu'une migration crée
 * un index dont la PREMIÈRE colonne est la colonne de FK.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

/** Colonnes de FK qui doivent être couvertes (table → colonnes). */
const REQUIRED_FK_INDEXES: Record<string, string[]> = {
  event_tasks: ["event_id", "parent_task_id"],
};

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("Index couvrants des FK (advisor unindexed_foreign_keys)", () => {
  it("chaque FK listée est la 1re colonne d'un index (couverture valide)", () => {
    const sql = allMigrationSql();
    for (const [table, cols] of Object.entries(REQUIRED_FK_INDEXES)) {
      for (const col of cols) {
        // index mono-colonne (col) OU composite mené par col
        const re = new RegExp(
          `CREATE INDEX[\\s\\S]*?ON public\\.${table}\\s*\\(\\s*${col}\\s*[,)]`,
          "i",
        );
        expect(re.test(sql), `FK ${table}.${col} non couverte par un index mené par cette colonne`).toBe(true);
      }
    }
  });

  it("la migration de correctif est réversible", () => {
    const rb = readFileSync(resolve(MIGRATIONS_DIR, "rollback/20261031000005_rollback.sql"), "utf8");
    expect(rb).toMatch(/DROP INDEX IF EXISTS public\.event_tasks_event_id_idx/);
    expect(rb).toMatch(/DROP INDEX IF EXISTS public\.event_tasks_parent_task_id_idx/);
  });
});
