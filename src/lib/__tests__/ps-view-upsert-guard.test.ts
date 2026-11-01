// @vitest-environment node
/**
 * Garde anti-récurrence R160 — écritures `UPSERT` sur une VUE PowerSync.
 *
 * Côté client, PowerSync expose chaque table comme une **VUE** (`CREATE VIEW
 * org_settings AS SELECT id, json_extract(data,'$.org_id') …`). Une écriture de
 * forme `INSERT … ON CONFLICT … DO UPDATE` ou `INSERT OR REPLACE` échoue alors
 * avec **« cannot UPSERT a view »**, silencieusement pour l'utilisateur (le
 * réglage n'est jamais persisté, le bouton paraît inerte).
 *
 * Bug réel mesuré (E7) : `setOrgSetting` faisait un `ON CONFLICT` → PR8
 * (maker-checker) et PR13 (gel de période) ne persistaient RIEN. Correctif :
 * `SELECT id` puis `UPDATE`-ou-`INSERT` explicite.
 *
 * Cette garde échoue sur toute NOUVELLE occurrence dans `src/` (hors tests et
 * hors migrations SQL, où `ON CONFLICT` reste valide côté Postgres).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = [
  join(ROOT, "src", "lib"),
  join(ROOT, "src", "capabilities"),
  join(ROOT, "src", "pages"),
  join(ROOT, "src", "components"),
];

/**
 * Occurrences connues et justifiées (cf. docs/agent/ESCALATIONS.md E7). Toute
 * autre occurrence fait échouer la garde — c'est le but : forcer une revue.
 */
const ALLOWLIST = new Map<string, string>([
  [
    "src/capabilities/organization/index.ts",
    "registerOrg() : code mort (aucun appelant), à traiter avec le schéma PowerSync",
  ],
  [
    "src/capabilities/invitation/index.ts",
    "claimInvitation() : dépend d'un changement de schéma/stream profiles (E7)",
  ],
]);

const FORBIDDEN = /(ON\s+CONFLICT|INSERT\s+OR\s+REPLACE)/i;

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

describe("R160 — aucune écriture UPSERT sur une vue PowerSync (hors allowlist)", () => {
  it("ne trouve pas d'`ON CONFLICT` / `INSERT OR REPLACE` non justifié dans src/", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        const rel = relative(ROOT, file).replace(/\\/g, "/");
        const src = readFileSync(file, "utf8");
        // Ignore les commentaires : on ne cherche que du code exécutable.
        const withoutComments = src
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "");
        if (FORBIDDEN.test(withoutComments) && !ALLOWLIST.has(rel)) {
          offenders.push(rel);
        }
      }
    }
    expect(
      offenders,
      `Écriture UPSERT détectée (échec « cannot UPSERT a view » côté PowerSync). ` +
        `Utiliser SELECT + UPDATE/INSERT explicite, ou justifier dans ALLOWLIST :\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("non-vacuité : la garde DÉTECTE une occurrence introduite (sonde)", () => {
    const probe = "await db.execute(`INSERT INTO t (id) VALUES (?) ON CONFLICT (id) DO NOTHING`);";
    expect(FORBIDDEN.test(probe)).toBe(true);
    const clean = "await db.execute('SELECT id FROM t WHERE org_id = ?', [org]);";
    expect(FORBIDDEN.test(clean)).toBe(false);
  });

  it("l'allowlist ne référence que des fichiers existants", () => {
    for (const rel of ALLOWLIST.keys()) {
      expect(() => statSync(join(ROOT, rel)), `${rel} introuvable`).not.toThrow();
    }
  });
});
