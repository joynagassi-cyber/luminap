/**
 * Non-régression sur le write path PowerSync → Supabase.
 *
 * Deux défauts critiques trouvés le 2026-10-22, tous deux dans
 * `SupabaseConnector.ts`, faisaient échouer TOUTE écriture client :
 *
 *  1. `SCHEMA_COLUMNS` étalait `table.columns` (des instances `Column`)
 *     dans un `Set` → le Set ne contenait que `"id"` et
 *     `"[object Object]"`, donc `filterOpDataToSchema` supprimait
 *     `org_id` et toutes les autres colonnes. Le PUT partait avec
 *     `{id}` seul et Supabase répondait 42501 (RLS
 *     `is_org_member(uid, NULL)` = false).
 *
 *  2. `NOT_NULL_DEFAULTS` fournissait `org_id: "org-e2e"` (l'org de
 *     test) : une colonne `org_id` absente était réécrite vers une
 *     autre organisation — faille d'isolation multi-tenant.
 *
 * Ces tests lisent la vraie configuration du connecteur (schéma
 * PowerSync réel + table de défauts réelle), pas une copie.
 */
import { describe, it, expect } from "vitest";
import { AppSchema } from "../powersync/schema";
import { buildSchemaColumns, NOT_NULL_DEFAULTS } from "../powersync/SupabaseConnector";

describe("PowerSync connector — filtre de colonnes", () => {
  it("conserve toutes les colonnes déclarées du schéma (dont org_id)", () => {
    const schemaColumns = buildSchemaColumns();

    const members = schemaColumns.members;
    expect(members).toBeDefined();
    expect(members!.has("id")).toBe(true);
    expect(members!.has("org_id")).toBe(true);
    expect(members!.has("first_name")).toBe(true);
    expect(members!.has("last_name")).toBe(true);
  });

  it("ne contient aucun nom de colonne non-chaîne", () => {
    const schemaColumns = buildSchemaColumns();
    for (const [table, cols] of Object.entries(schemaColumns)) {
      for (const col of cols!) {
        expect(typeof col, `${table}.${col}`).toBe("string");
        expect(col).not.toContain("[object");
      }
    }
  });

  it("couvre chaque table du schéma avec la PK + ses colonnes", () => {
    const schemaColumns = buildSchemaColumns();
    for (const table of AppSchema.tables) {
      const cols = schemaColumns[table.name];
      expect(cols, `table ${table.name}`).toBeDefined();
      expect(cols!.size, `table ${table.name}`).toBe(table.columns.length + 1);
    }
  });
});

describe("PowerSync connector — défauts NOT NULL", () => {
  it("ne définit jamais org_id (colonne d'isolation multi-tenant)", () => {
    for (const [table, defaults] of Object.entries(NOT_NULL_DEFAULTS)) {
      expect(
        Object.keys(defaults),
        `table ${table} ne doit pas fournir org_id`,
      ).not.toContain("org_id");
    }
  });

  it("ne contient aucune valeur d'org de test codée en dur", () => {
    const serialized = JSON.stringify(NOT_NULL_DEFAULTS);
    expect(serialized).not.toContain("org-e2e");
    expect(serialized).not.toContain("org-1");
  });
});
