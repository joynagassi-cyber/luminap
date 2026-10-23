import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "../utils";

/**
 * R57 — `formatDate` plantait avec `RangeError: Invalid time value`
 * (date-fns) sur une date vide/invalide. L'exception remontait jusqu'au
 * LazyRouteErrorBoundary et remplaçait TOUTE la page (Dashboard) par
 * l'écran « Impossible d'afficher cette page ». Le helper doit être
 * défensif : une entrée inexploitable retourne "" et n'efface pas la page.
 */
describe("formatDate (défensif)", () => {
  it("formate une date ISO valide", () => {
    expect(formatDate("2026-10-01")).toMatch(/1 oct\.? 2026/);
  });

  it("formate un objet Date valide", () => {
    expect(formatDate(new Date("2026-03-15T12:00:00Z"))).toMatch(/15 mars 2026/);
  });

  it("retourne '' pour une chaîne vide (cas PowerSync : colonne NULL)", () => {
    expect(formatDate("")).toBe("");
  });

  it("retourne '' pour une date invalide (jamais de RangeError)", () => {
    expect(() => formatDate("pas-une-date")).not.toThrow();
    expect(formatDate("pas-une-date")).toBe("");
  });

  it("retourne '' pour null/undefined (champ optionnel absent)", () => {
    expect(formatDate(null as unknown as string)).toBe("");
    expect(formatDate(undefined as unknown as string)).toBe("");
  });

  it("retourne '' pour un objet Date invalide", () => {
    expect(formatDate(new Date("invalid"))).toBe("");
  });
});

describe("formatDateTime (défensif)", () => {
  it("formate une date ISO valide avec l'heure", () => {
    expect(formatDateTime("2026-10-01T08:30:00Z")).toMatch(/1 oct\.? 2026 à /);
  });

  it("retourne '' pour une entrée invalide", () => {
    expect(formatDateTime("")).toBe("");
    expect(formatDateTime("nope")).toBe("");
    expect(formatDateTime(null as unknown as string)).toBe("");
  });
});
