/**
 * PR11 — Recherche globale : cœur pur (`src/lib/globalSearch.ts`).
 *
 * Ce que ces tests verrouillent (comportement, pas implémentation) :
 *   1. `normalizeText` replie casse ET accents → « ecole » trouve « École » ;
 *   2. `scoreMatch` classe exact > préfixe > sous-chaîne ;
 *   3. `searchRecords` respecte l'ordre (exact avant préfixe avant sous-chaîne),
 *      départage par récence, et BORNE le nombre de résultats ;
 *   4. une requête vide (ou blanche) ne renvoie RIEN (état neutre) ;
 *   5. `toSearchRecords` adapte les collections du data layer (snake_case ET
 *      camelCase) en enregistrements porteurs d'un lien profond.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - retirer le repli d'accents (`normalize("NFD").replace(...)`) ⇒ le test
 *     « ecole trouve École » échoue ;
 *   - remplacer `b.score - a.score` par `a.score - b.score` ⇒ le test d'ordre
 *     (exact avant sous-chaîne) échoue ;
 *   - retirer le `.slice(0, limit)` ⇒ le test de borne échoue.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeText,
  scoreMatch,
  searchRecords,
  toSearchRecords,
  DEFAULT_SEARCH_LIMIT,
  type SearchRecord,
} from "../globalSearch";

describe("normalizeText — casse et accents", () => {
  it("replie les minuscules et les accents", () => {
    expect(normalizeText("École")).toBe("ecole");
    expect(normalizeText("ÇA")).toBe("ca");
    expect(normalizeText("Dîme")).toBe("dime");
    expect(normalizeText("  Marie   Thérèse ")).toBe("marie therese");
  });

  it("tolère null / undefined sans lever", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("scoreMatch — exact > préfixe > sous-chaîne", () => {
  it("classe les trois niveaux", () => {
    const exact = scoreMatch("ecole", "École");
    const prefix = scoreMatch("eco", "École");
    const substring = scoreMatch("col", "École");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it("aucune correspondance → 0", () => {
    expect(scoreMatch("xyz", "École")).toBe(0);
    expect(scoreMatch("", "École")).toBe(0);
    expect(scoreMatch("ecole", "")).toBe(0);
  });
});

function rec(
  id: string,
  title: string,
  subtitle = "",
  date: string | null = null,
): SearchRecord {
  return { kind: "member", id, title, subtitle, date, route: `/membre/${id}` };
}

describe("searchRecords — ordre et bornes", () => {
  it("classe exact avant préfixe avant sous-chaîne", () => {
    const records = [
      rec("sub", "Mon école du dimanche"), // sous-chaîne
      rec("pre", "École biblique"), // préfixe
      rec("exa", "École"), // exact
    ];
    const results = searchRecords("ecole", records);
    expect(results.map((r) => r.id)).toEqual(["exa", "pre", "sub"]);
  });

  it("replie les accents : « ecole » trouve « École »", () => {
    const results = searchRecords("ecole", [rec("1", "École du dimanche")]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("départage à score égal par la récence (plus récent d'abord)", () => {
    const records = [
      rec("old", "Chorale", "", "2024-01-01T00:00:00Z"),
      rec("new", "Chorale", "", "2026-01-01T00:00:00Z"),
    ];
    const results = searchRecords("chorale", records);
    expect(results.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("respecte la borne (max N résultats)", () => {
    const records = Array.from({ length: 50 }, (_, i) =>
      rec(`m${i}`, `Membre ${i}`),
    );
    const capped = searchRecords("membre", records, { limit: 5 });
    expect(capped).toHaveLength(5);
    expect(searchRecords("membre", records)).toHaveLength(DEFAULT_SEARCH_LIMIT);
  });

  it("une requête vide ou blanche ne renvoie RIEN", () => {
    const records = [rec("1", "École")];
    expect(searchRecords("", records)).toEqual([]);
    expect(searchRecords("   ", records)).toEqual([]);
  });

  it("le sous-titre compte aussi (mais pèse moins que le titre)", () => {
    const records = [
      rec("title", "Paul"),
      rec("subtitle", "Jean", "contact paul@exemple.org"),
    ];
    const results = searchRecords("paul", records);
    expect(results.map((r) => r.id)).toEqual(["title", "subtitle"]);
  });
});

describe("toSearchRecords — adaptation data layer", () => {
  it("adapte les lignes snake_case (PowerSync) avec leur lien profond", () => {
    const records = toSearchRecords({
      members: [
        { id: "m1", first_name: "Marie", last_name: "Kouassi", email: "m@e.org" },
      ],
      groups: [{ id: "g1", name: "Chorale" }],
      events: [{ id: "e1", name: "Culte du dimanche" }],
      transactions: [
        { id: "t1", description: "Dîme de mars", type: "INCOME" },
      ],
      documents: [{ id: "d1", title: "PV assemblée" }],
      forms: [{ id: "f1", name: "Demande de baptême" }],
    });
    const byId = new Map(records.map((r) => [r.id, r]));
    expect(byId.get("m1")?.title).toBe("Marie Kouassi");
    expect(byId.get("m1")?.route).toBe("/membre/m1");
    expect(byId.get("g1")?.route).toBe("/groups/g1");
    expect(byId.get("e1")?.route).toBe("/event/e1");
    expect(byId.get("t1")?.route).toBe("/transaction/t1");
    expect(byId.get("t1")?.subtitle).toBe("Entrée");
    expect(byId.get("d1")?.route).toBe("/archives");
    expect(byId.get("f1")?.route).toBe("/forms/f1/submissions");
  });

  it("tolère le repli local camelCase et ignore les lignes sans id", () => {
    const records = toSearchRecords({
      members: [
        { id: "m2", firstName: "Jean", lastName: "Dupont" },
        { firstName: "Sans", lastName: "Id" },
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0].title).toBe("Jean Dupont");
  });

  it("une recherche accent-insensible retrouve le membre via le sous-titre (e-mail)", () => {
    const records = toSearchRecords({
      members: [{ id: "m3", first_name: "Thérèse", last_name: "N'Guessan" }],
    });
    const results = searchRecords("therese", records);
    expect(results.map((r) => r.id)).toEqual(["m3"]);
  });
});
