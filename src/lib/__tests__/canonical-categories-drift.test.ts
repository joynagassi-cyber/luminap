/**
 * Garde anti-dérive — catégories canoniques (R89.a).
 *
 * Le défaut R89.a venait d'une divergence silencieuse entre les identifiants
 * écrits par le client et ceux présents côté serveur. Ce test verrouille les
 * trois artefacts qui doivent rester alignés :
 *   1. `src/lib/canonicalCategories.ts` (source unique) ;
 *   2. la migration de seed serveur (`…_seed_canonical_categories.sql`) ;
 *   3. le seed local du pack (`src/packs/church/index.ts`).
 *
 * Si l'un des trois diverge, la FK `transactions.category_id` cesserait de
 * résoudre et les transactions seraient de nouveau jetées en silence.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

import {
  CANONICAL_CATEGORIES,
  DEFAULT_CATEGORY_ID,
  isCanonicalCategoryId,
} from "@/lib/canonicalCategories";
import { churchSeedData } from "@/packs/church";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("R89.a — catégories canoniques (anti-dérive)", () => {
  it("les identifiants sont uniques", () => {
    const ids = CANONICAL_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("le seed serveur contient chaque identifiant canonique", () => {
    const sql = read(
      "supabase/migrations/20261026000006_seed_canonical_categories.sql",
    );
    for (const c of CANONICAL_CATEGORIES) {
      expect(sql, `migration : id manquant ${c.id}`).toContain(`'${c.id}'`);
      expect(sql, `migration : clé manquante ${c.key}`).toContain(`'${c.key}'`);
    }
    expect(sql, "le seed doit être idempotent").toContain(
      "ON CONFLICT (id) DO NOTHING",
    );
  });

  it("le seed local du pack utilise exactement les identifiants canoniques", () => {
    const seedIds = churchSeedData().categories.map((c) => c.id).sort();
    const canonicalIds = CANONICAL_CATEGORIES.map((c) => c.id).sort();
    expect(seedIds).toEqual(canonicalIds);
  });

  it("le défaut de repli est un identifiant canonique", () => {
    expect(isCanonicalCategoryId(DEFAULT_CATEGORY_ID)).toBe(true);
  });
});
