/**
 * Garde anti-dérive (R65.b) — toute colonne `jsonb` PostgreSQL d'une table
 * synchronisée DOIT figurer dans `JSONB_COLUMNS` (`src/lib/jsonb.ts`), sinon
 * le client peut la sérialiser en chaîne et produire un jsonb de type `string`
 * (défaut R65 : écrans qui tombent au premier `.map()`).
 *
 * Pourquoi une garde d'inventaire plutôt qu'une requête SQL en CI :
 *   - aucun accès base en CI (pas de secret DB) et l'invariant jsonb mesuré
 *     en base resterait impossible à vérifier après coup ;
 *   - la cause racine est une **dérive de code** (schéma PG vs table de
 *     conversion), entièrement visible dans le dépôt ;
 *   - c'est déterministe et instantané (lecture de fichiers, aucun réseau).
 *
 * La source de vérité est le dossier `supabase/migrations/` : on y relève les
 * colonnes déclarées `jsonb`. L'inventaire a été validé contre
 * `information_schema.columns` de la base de développement le 2026-10-28 :
 * les 10 colonnes `jsonb` réelles y correspondent exactement.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { JSONB_COLUMNS } from "@/lib/jsonb";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

/** Colonnes `jsonb` déclarées dans les migrations (`table.column`). */
export function declaredJsonbColumns(): string[] {
  const out = new Set<string>();
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

  for (const file of files) {
    const src = readFileSync(resolve(migrationsDir, file), "utf8");

    // CREATE TABLE … ( colonne jsonb, … )
    const createRe =
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?\s*\(/gi;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(src)) !== null) {
      const table = m[1].toLowerCase();
      const rest = src.slice(createRe.lastIndex);
      const end = /\n\s*\)\s*;/.exec(rest);
      const body = end ? rest.slice(0, end.index) : rest;
      for (const col of body.matchAll(/^\s*"?(\w+)"?\s+jsonb\b/gim)) {
        out.add(`${table}.${col[1].toLowerCase()}`);
      }
    }

    // ALTER TABLE … ADD COLUMN … jsonb
    const addRe = /add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?\s+jsonb/gi;
    while ((m = addRe.exec(src)) !== null) {
      const col = m[1].toLowerCase();
      const before = src.slice(0, m.index);
      const alters = [
        ...before.matchAll(
          /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi,
        ),
      ];
      if (alters.length) {
        out.add(`${alters[alters.length - 1][1].toLowerCase()}.${col}`);
      }
    }
  }
  return [...out].sort();
}

/** Colonnes converties par le client, moins les `text[]` traités comme jsonb. */
export function coveredColumns(): string[] {
  const declared = declaredJsonbColumns();
  const textArrays = new Set(["custom_field_definitions.options"]);
  const covered = new Set<string>();
  for (const [table, cols] of Object.entries(JSONB_COLUMNS)) {
    for (const col of cols) covered.add(`${table}.${col}`);
  }
  // L'union attendue : les colonnes jsonb déclarées + les text[] converties.
  return [...new Set([...declared, ...textArrays])].sort();
}

describe("jsonb — inventaire migrations ↔ JSONB_COLUMNS (R65.b)", () => {
  it("l'inventaire des migrations correspond aux 10 colonnes jsonb de la base (contrôle)", () => {
    // Contrôle de justesse du parseur : ces 10 colonnes ont été relevées dans
    // `information_schema.columns` (base hhgovvrnalibhgpakswi, 2026-10-28).
    expect(declaredJsonbColumns()).toEqual(
      [
        "audit_entries.after_state",
        "audit_entries.before_state",
        "custom_field_values.value",
        "events.budget_items",
        "form_definitions.fields",
        "form_submissions.data",
        "invitations.grants_payload",
        "invitations.tags_payload",
        "org_reports.content",
        "report_definitions.filters",
      ].sort(),
    );
  });

  it("toute colonne jsonb (ou text[] convertie) est couverte par JSONB_COLUMNS", () => {
    const covered = new Set(
      Object.entries(JSONB_COLUMNS).flatMap(([t, cols]) =>
        cols.map((c) => `${t}.${c}`),
      ),
    );
    const missing = coveredColumns().filter((c) => !covered.has(c));
    expect(
      missing,
      `colonnes jsonb non converties (double encodage possible) : ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("aucune colonne déclarée dans JSONB_COLUMNS n'est absente des migrations (pas d'entrée morte)", () => {
    const known = new Set(coveredColumns());
    const stale = Object.entries(JSONB_COLUMNS)
      .flatMap(([t, cols]) => cols.map((c) => `${t}.${c}`))
      .filter((c) => !known.has(c));
    expect(
      stale,
      `entrées JSONB_COLUMNS sans colonne correspondante : ${stale.join(", ")}`,
    ).toEqual([]);
  });
});
