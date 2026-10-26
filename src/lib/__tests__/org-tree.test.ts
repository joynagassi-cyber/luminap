/**
 * Phase 3 — arbre multi-organisation : anti-cycle, clôture transitive,
 * profondeur/largeur non plafonnées.
 *
 * Contrat §Phase 3 : « profondeur/largeur non plafonnées, sans cycle ».
 * Défaut réel prouvé (audit 2026-10-26) : aucune garde anti-cycle n'existe
 * (ni trigger DB, ni contrôle TS dans `federation.setParentOrg`) ; un
 * re-parentage d'une org sous l'un de ses descendants crée un cycle qui fait
 * boucler `org_family` / `org_descendants` (CTE `WITH RECURSIVE`) à l'infini.
 */
import { describe, it, expect } from "vitest";
import {
  wouldCreateCycle,
  assertReparentAllowed,
  buildClosure,
  computeDescendants,
  computeAncestors,
  maxDepth,
  maxBreadth,
} from "../orgTree";

type Row = { id: string; parentOrgId: string | null };

const rows: Row[] = [
  { id: "mother", parentOrgId: null },
  { id: "a", parentOrgId: "mother" },
  { id: "b", parentOrgId: "a" },
  { id: "c", parentOrgId: "b" },
];

const parentOf = (rs: Row[]) =>
  new Map<string, string | null>(rs.map((r) => [r.id, r.parentOrgId]));

describe("anti-cycle", () => {
  it("refuse de rattacher une org à elle-même", () => {
    expect(wouldCreateCycle("a", "a", parentOf(rows))).toBe(true);
  });

  it("refuse de rattacher une org à son enfant (cycle direct)", () => {
    expect(wouldCreateCycle("a", "b", parentOf(rows))).toBe(true);
  });

  it("refuse de rattacher une org à un descendant profond (cycle indirect)", () => {
    expect(wouldCreateCycle("mother", "c", parentOf(rows))).toBe(true);
  });

  it("autorise un rattachement vers un non-descendant", () => {
    expect(wouldCreateCycle("c", "mother", parentOf(rows))).toBe(false);
  });

  it("autorise le détachement (parent = null)", () => {
    expect(wouldCreateCycle("a", null, parentOf(rows))).toBe(false);
  });

  it("assertReparentAllowed lève sur un cycle et ne lève pas sinon", () => {
    expect(() => assertReparentAllowed("a", "c", parentOf(rows))).toThrow(
      /cycle/i,
    );
    expect(() =>
      assertReparentAllowed("c", "mother", parentOf(rows)),
    ).not.toThrow();
  });
});

describe("clôture transitive", () => {
  it("couvre soi-même (depth 0) et tous les ancêtres", () => {
    const closure = buildClosure(rows);
    const cAncestors = computeAncestors("c", closure).map((e) => e.ancestor);
    expect(cAncestors).toEqual(["c", "b", "a", "mother"]);
  });

  it("couvre tous les descendants (profondeur illimitée)", () => {
    const closure = buildClosure(rows);
    const motherDesc = computeDescendants("mother", closure).map(
      (e) => e.descendant,
    );
    expect(motherDesc.sort()).toEqual(["a", "b", "c", "mother"]);
  });

  it("profondeur >= 20 sans erreur (largeur non plafonnée)", () => {
    const deep: Row[] = [{ id: "n0", parentOrgId: null }];
    for (let i = 1; i <= 25; i++) {
      deep.push({ id: `n${i}`, parentOrgId: `n${i - 1}` });
    }
    const closure = buildClosure(deep);
    expect(maxDepth(closure)).toBe(25);
    expect(computeDescendants("n0", closure)).toHaveLength(26);
  });

  it("largeur >= 100 sans erreur", () => {
    const wide: Row[] = [{ id: "root", parentOrgId: null }];
    for (let i = 0; i < 150; i++) {
      wide.push({ id: `w${i}`, parentOrgId: "root" });
    }
    const closure = buildClosure(wide);
    expect(maxBreadth(wide)).toBe(150);
    expect(computeDescendants("root", closure)).toHaveLength(151);
  });

  it("buildClosure est tolérant à un cycle préexistant (ne boucle pas)", () => {
    // Données corrompues : a→b→a. La construction doit terminer (garde-fou).
    const cyclic: Row[] = [
      { id: "a", parentOrgId: "b" },
      { id: "b", parentOrgId: "a" },
    ];
    const closure = buildClosure(cyclic);
    expect(closure.length).toBeGreaterThan(0);
  });
});
