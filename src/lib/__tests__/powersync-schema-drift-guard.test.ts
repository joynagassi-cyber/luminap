// @vitest-environment node
/**
 * Garde anti-dérive de schéma (classe #317 / R184).
 *
 * DÉFAUT VISÉ : le SQL client (PowerSync) référence une table/colonne ABSENTE du
 * schéma local déclaré dans `src/lib/powersync/schema.ts`. SQLite échoue alors
 * avec **« no such column: X »** — erreur de fonctionnement opaque pour
 * l'utilisateur, remontée en Issue GitHub.
 *
 * Cas réel mesuré : `reporting.ts` faisait
 * `INSERT … report_definitions (…, kind, …)` / `SELECT …, kind, …` alors que la
 * table locale ne déclarait pas `kind` → `/reports` et `/report-builder` cassés
 * (Issue #317). La colonne existait pourtant côté PostgreSQL (migration
 * `20260922000001`) : la dérive venait du schéma PowerSync non mis à jour.
 *
 * La garde lit le VRAI `AppSchema` (pas une copie) et vérifie chaque liste de
 * colonnes écrite en dur dans le SQL `INSERT`/`SELECT` de `src/`.
 *
 * Limites assumées : analyse statique par expression régulière. Les clauses
 * contenant une fonction (`(`, `json_extract`…), un `*`, un `?`, un alias ou du
 * SQL construit dynamiquement sont ignorées (faux négatifs acceptés ; on
 * privilégie l'absence de faux positifs). Les occurrences connues et justifiées
 * figurent dans `ALLOWLIST`.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { AppSchema } from "../powersync/schema";

const ROOT = process.cwd();
const SCAN_DIRS = ["src/lib", "src/capabilities", "src/pages", "src/components"].map((d) =>
  join(ROOT, d),
);

/** Colonnes réelles par table, d'après le schéma PowerSync exécuté. */
function schemaColumns(): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  for (const table of AppSchema.tables) {
    out[table.name] = new Set(["id", ...table.columns.map((c) => c.name)]);
  }
  return out;
}

/**
 * Occurrences connues : code MORT (aucun appelant hors tests) déjà escaladé
 * (docs/agent/ESCALATIONS.md E7). Elles échouent à l'exécution mais ne sont
 * jamais atteintes en production ; les corriger exige un changement de schéma +
 * stream, hors périmètre de cette garde.
 */
const ALLOWLIST = new Set([
  "src/capabilities/organization/index.ts", // org_units.updated_at (addOrgUnit, mort)
  "src/capabilities/invitation/index.ts", // profiles.status (claimInvitation, mort)
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

function splitColumns(clause: string): string[] {
  // On ne retient que les éléments qui SONT un identifiant nu ; tout le reste
  // (alias, fonction, expression) est ignoré → pas de faux positif.
  return clause
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^[a-z_][a-z0-9_]*$/i.test(c));
}

/** Colonnes suspectes d'un fichier (table + colonne absentes du schéma). */
function findDrift(src: string, schema: Record<string, Set<string>>): string[] {
  const problems: string[] = [];
  const code = stripComments(src);

  // INSERT [OR REPLACE] INTO table (col, col, …)
  for (const m of code.matchAll(
    /INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-z_][a-z0-9_]*)\s*\(([^)]*)\)/gi,
  )) {
    const table = m[1];
    const known = schema[table];
    if (!known) continue;
    for (const col of splitColumns(m[2])) {
      if (!known.has(col)) problems.push(`${table}.${col} (INSERT)`);
    }
  }

  // SELECT col, col, … FROM table — clause simple uniquement (on rejette si
  // elle contient une fonction, un `*`, un `?` ou un alias).
  for (const m of code.matchAll(
    /SELECT\s+([\s\S]*?)\s+FROM\s+([a-z_][a-z0-9_]*)/gi,
  )) {
    const clause = m[1];
    const table = m[2];
    const known = schema[table];
    if (!known) continue;
    if (/[()*?]/.test(clause)) continue;
    for (const col of splitColumns(clause)) {
      if (!known.has(col)) problems.push(`${table}.${col} (SELECT)`);
    }
  }
  return problems;
}

describe("anti-dérive de schéma — SQL client ↔ AppSchema PowerSync", () => {
  const schema = schemaColumns();
  const files = SCAN_DIRS.flatMap((d) => walk(d));

  it("le schéma est bien chargé (non-vacuité)", () => {
    expect(Object.keys(schema).length).toBeGreaterThan(20);
    expect(schema.report_definitions?.has("kind")).toBe(true);
    expect(files.length).toBeGreaterThan(100);
  });

  it("aucune colonne référencée en SQL n'est absente du schéma local", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (ALLOWLIST.has(rel)) continue;
      for (const p of findDrift(readFileSync(file, "utf8"), schema)) {
        offenders.push(`${rel}: ${p}`);
      }
    }
    expect(
      offenders,
      "SQL client référençant une colonne absente du schéma PowerSync local " +
        "→ « no such column » à l'exécution. Ajouter la colonne à " +
        "src/lib/powersync/schema.ts (et bumper CLIENT_SCHEMA_VERSION), ou " +
        "justifier dans ALLOWLIST :\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("le détecteur reconnaît la dérive #317 (auto-test)", () => {
    const bad = new Set(["id", "org_id", "name"]); // sans `kind`
    const schemaFixture = { report_definitions: bad };
    expect(
      findDrift(
        "INSERT INTO report_definitions (id, org_id, name, kind) VALUES (?,?,?,?)",
        schemaFixture,
      ),
    ).toContain("report_definitions.kind (INSERT)");
    expect(
      findDrift("SELECT id, name, kind FROM report_definitions WHERE org_id = ?", schemaFixture),
    ).toContain("report_definitions.kind (SELECT)");
    // Formes légitimes : `SELECT *`, fonctions, table inconnue.
    expect(findDrift("SELECT * FROM report_definitions", schemaFixture)).toEqual([]);
    expect(
      findDrift("SELECT count(*) FROM report_definitions", schemaFixture),
    ).toEqual([]);
    expect(findDrift("SELECT x FROM table_hors_schema", schemaFixture)).toEqual([]);
  });
});
