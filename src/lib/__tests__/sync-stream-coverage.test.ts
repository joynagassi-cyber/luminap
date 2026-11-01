// @vitest-environment node
/**
 * Garde anti-dérive — couverture des streams PowerSync (classe « filet
 * déclaré, jamais câblé »).
 *
 * DÉFAUT VISÉ : une table figure dans le schéma client (`AppSchema`) et est lue
 * via le SQL LOCAL (`useQuery` / `db.execute`), MAIS aucun stream de
 * `powersync/sync-config.yaml` ne la synchronise. La réplique locale reste
 * alors VIDE en permanence : l'écran affiche « aucune donnée » et un appareil
 * neuf ne reçoit jamais les lignes — sans aucune erreur visible.
 *
 * Cas réel mesuré (2026-11-01, config DÉPLOYÉE vérifiée via
 * `powersync fetch status`) : 9 tables sans stream — `audit_entries`
 * (5 250 lignes en base, piste d'audit PR1 `/trace`), `documents`,
 * `org_budgets`, `org_budget_lines`, `giving_donors`, `giving_campaigns`,
 * `pledges`, `tax_receipts`, `transaction_giving`.
 *
 * La garde échoue si une table du schéma client est lue en LOCAL sans stream.
 * Les tables sans usage local (ou sans table serveur) sont inscrites dans
 * `NO_STREAM_ALLOWLIST` avec une raison.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { AppSchema } from "../powersync/schema";

const ROOT = process.cwd();

/**
 * Tables volontairement SANS stream de synchronisation.
 * - `config` : table de configuration HISTORIQUE, absente de la base vivante
 *   (aucune relation `public.config`) et lue par AUCUN code client — entrée de
 *   schéma morte. On ne crée pas de stream pour une table qui n'existe pas.
 */
const NO_STREAM_ALLOWLIST = new Set<string>(["config"]);

/** Noms de tables du schéma client. */
function schemaTableNames(): string[] {
  return AppSchema.tables.map((t) => t.name);
}

/**
 * Tables SYNCHRONISÉES = celles présentes dans un `FROM <table>` d'un stream.
 * On lit le nom de la TABLE, pas celui du stream : un stream peut porter un nom
 * différent de la table qu'il synchronise (ex. `org_owned` synchronise
 * `organizations`).
 */
function syncedTables(): Set<string> {
  const yaml = readFileSync(join(ROOT, "powersync/sync-config.yaml"), "utf8");
  const body = yaml.slice(yaml.indexOf("streams:"));
  const out = new Set<string>();
  for (const m of body.matchAll(/\bFROM\s+([a-z_][a-z0-9_]*)/gi)) {
    out.add(m[1].toLowerCase());
  }
  return out;
}

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

/**
 * Tables lues via le SQL LOCAL (chaîne littérale `FROM <table>` / `INTO
 * <table>`). On scanne le code applicatif (hors schéma PowerSync et hors
 * tests) : c'est là que vit le SQL exécuté par `db.execute`/`useQuery`.
 */
function locallyReadTables(): Set<string> {
  const out = new Set<string>();
  const dirs = ["src/lib", "src/capabilities", "src/pages", "src/components", "src/hooks"].map(
    (d) => join(ROOT, d),
  );
  for (const dir of dirs) {
    for (const file of walk(dir)) {
      if (file.endsWith(join("powersync", "schema.ts"))) continue;
      const src = readFileSync(file, "utf8").replace(
        /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
        "",
      );
      for (const m of src.matchAll(/\b(?:FROM|INTO)\s+([a-z_][a-z0-9_]*)/gi)) {
        out.add(m[1].toLowerCase());
      }
    }
  }
  return out;
}

describe("sync-config — toute table locale a un stream", () => {
  const tables = schemaTableNames();
  const streams = syncedTables();
  const readLocally = locallyReadTables();

  it("le schéma client et la config de sync ne sont pas vides (sanity)", () => {
    expect(tables.length).toBeGreaterThan(20);
    expect(streams.size).toBeGreaterThan(20);
  });

  it("aucune table lue en LOCAL n'est dépourvue de stream", () => {
    const orphans = tables.filter(
      (t) =>
        readLocally.has(t) && !streams.has(t) && !NO_STREAM_ALLOWLIST.has(t),
    );
    expect(
      orphans,
      `tables lues en local SANS stream PowerSync (réplique vide en prod) : ${orphans.join(", ")}`,
    ).toEqual([]);
  });

  it("l'allowlist ne contient que des tables réelles (pas d'entrée obsolète)", () => {
    const stale = [...NO_STREAM_ALLOWLIST].filter((t) => !tables.includes(t));
    expect(stale, `entrées obsolètes : ${stale.join(", ")}`).toEqual([]);
  });
});
