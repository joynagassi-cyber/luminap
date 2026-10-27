/**
 * Garde d'inventaire RLS (plan §5.1 : « requête d'audit prouvant RLS + ≥1
 * politique par table exposée »).
 *
 * Le contrôle vivait uniquement dans `scripts/rls-isolation-check.sh`, qui
 * exige des identifiants Supabase (indisponibles en CI). Ce test le rend
 * **exécutable partout** en figeant l'inventaire mesuré (`rls-inventory.json`)
 * et en vérifiant l'invariant : toute table du schéma `public` a RLS activée et
 * au moins une politique, SAUF les tables en *deny-all* volontaire (liste
 * blanche explicite).
 *
 * Régénérer l'inventaire après tout changement de schéma/RLS :
 *
 *   with exposed as (
 *     select c.relname as table_name, c.relrowsecurity as rls
 *     from pg_class c join pg_namespace n on n.oid=c.relnamespace
 *     where n.nspname='public' and c.relkind='r'
 *   ), pol as (
 *     select tablename, count(*) n from pg_policies where schemaname='public' group by 1
 *   )
 *   select json_agg(json_build_object('table', e.table_name, 'rls', e.rls,
 *          'policies', coalesce(p.n,0)) order by e.table_name)
 *   from exposed e left join pol p on p.tablename = e.table_name;
 */
import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, it, expect } from "vitest";

interface RlsRow {
  table: string;
  rls: boolean;
  policies: number;
}

const doc = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../docs/agent/rls-inventory.json"),
    "utf8",
  ),
) as { tables: RlsRow[]; _denyAllAllowlist: string[] };

const { tables, _denyAllAllowlist: allowlist } = doc;

describe("inventaire RLS (toute table exposée protégée)", () => {
  it("l'inventaire couvre un nombre plausible de tables", () => {
    expect(tables.length).toBeGreaterThan(30);
  });

  it("RLS est activée sur CHAQUE table du schéma public", () => {
    const withoutRls = tables.filter((t) => !t.rls).map((t) => t.table);
    expect(withoutRls, `tables sans RLS : ${withoutRls.join(", ")}`).toEqual([]);
  });

  it("chaque table a ≥1 politique, sauf le deny-all volontaire", () => {
    const withoutPolicy = tables
      .filter((t) => t.policies === 0 && !allowlist.includes(t.table))
      .map((t) => t.table);
    expect(
      withoutPolicy,
      `tables sans politique : ${withoutPolicy.join(", ")}`,
    ).toEqual([]);
  });

  it("le deny-all volontaire reste minimal et documenté (R97)", () => {
    const denyAll = tables.filter((t) => t.policies === 0).map((t) => t.table);
    expect(denyAll.sort()).toEqual([...allowlist].sort());
  });
});
