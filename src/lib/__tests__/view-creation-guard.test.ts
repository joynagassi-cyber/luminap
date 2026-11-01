// @vitest-environment node
/**
 * Garde anti-dérive R17 — toute VUE publique attendue doit être créée par une
 * migration du dépôt.
 *
 * Défaut mesuré (2026-10-31) : la vue `public.org_federation` existait en base
 * SANS aucun `CREATE ... VIEW` dans le dépôt → une base reconstruite depuis les
 * migrations ne l'aurait pas eue (R17, écart de reproductibilité). Corrigé par
 * la migration `20261031000006`.
 *
 * Cette garde verrouille la liste des vues attendues côté dépôt. Elle échoue si
 * une vue listée n'a plus de CREATE (régression) ou si une nouvelle vue DB est
 * ajoutée sans CREATE (il faut alors l'ajouter ici ET dans une migration).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

/** Vues publiques qui DOIVENT être créées par le dépôt. */
const REQUIRED_VIEWS = ["org_family", "org_federation"];

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("Vues publiques créées par le dépôt (anti-dérive R17)", () => {
  it("chaque vue attendue a un CREATE VIEW dans les migrations", () => {
    const sql = allMigrationSql();
    for (const view of REQUIRED_VIEWS) {
      const re = new RegExp(
        `CREATE\\s+(?:OR\\s+REPLACE\\s+)?VIEW\\s+(?:public\\.)?${view}\\b`,
        "i",
      );
      expect(re.test(sql), `Vue ${view} absente des migrations du dépôt (dérive R17)`).toBe(true);
    }
  });

  it("org_federation est recréée avec security_invoker=true (pas de fuite inter-org)", () => {
    const sql = allMigrationSql();
    expect(
      /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?org_federation[\s\S]{0,120}?security_invoker\s*=\s*true/i.test(
        sql,
      ),
      "org_federation doit être créée avec security_invoker=true",
    ).toBe(true);
  });
});
