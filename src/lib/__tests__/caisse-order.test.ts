import { describe, it, expect } from "vitest";
import { sortCaisses, isMainCaisse } from "@/lib/caisseOrder";

describe("caisseOrder — ordre des caisses", () => {
  it("place la caisse principale (id 'main') en tête, quel que soit l'alphabet", () => {
    const out = sortCaisses([
      { id: "z-group", name: "Zélie" },
      { id: "main", name: "Caisse principale" },
      { id: "a-group", name: "Aumônerie" },
    ]);
    expect(out.map((c) => c.id)).toEqual(["main", "a-group", "z-group"]);
  });

  it("reconnaît le principal par type MAIN ou owner_type ORGANIZATION", () => {
    expect(isMainCaisse({ id: "x", type: "MAIN" })).toBe(true);
    expect(isMainCaisse({ id: "x", owner_type: "ORGANIZATION" })).toBe(true);
    expect(isMainCaisse({ id: "x", type: "GROUP" })).toBe(false);
  });

  it("trie les groupes par nom (FR, insensible à la casse)", () => {
    const out = sortCaisses([
      { id: "b", name: "bâtisseurs" },
      { id: "a", name: "Aumônerie" },
    ]);
    expect(out.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("ne MUTE pas la liste d'entrée (retourne une copie)", () => {
    const input = [
      { id: "b", name: "Bravo" },
      { id: "main", name: "Principale" },
    ];
    const before = input.map((c) => c.id);
    sortCaisses(input);
    expect(input.map((c) => c.id)).toEqual(before);
  });
});
