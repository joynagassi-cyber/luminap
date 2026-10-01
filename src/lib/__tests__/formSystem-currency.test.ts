// @vitest-environment node
// T7 Forms v2 — parsing d'une saisie de montant (currency).
// `parseCurrencyAmount` (formSystem) :
//   - « 1,500 » (virgule + 3 chiffres) -> 1500  (séparateur de milliers)
//   - « 1,5 » / « 1.5 »              -> 1.5   (virgule décimale FR / point US)
//   - « abc »                         -> null  (rejeté par la validation)
//   - 1-2 chiffres après le séparateur => décimal (arrondi 2 décimales)
//   - 3+ chiffres après le séparateur => milliers (tous les séparateurs retirés)
import { describe, it, expect } from "vitest";
import { parseCurrencyAmount, validateFormSubmission } from "@/lib/formSystem";
import type { FormDefinition, FormFieldDefinition } from "@/types";

describe("parseCurrencyAmount (T7 Forms v2)", () => {
  it("convertit « 1,500 » en 1500 (virgule = séparateur de milliers)", () => {
    expect(parseCurrencyAmount("1,500")).toBe(1500);
  });

  it("accepte la virgule décimale FR (1-2 chiffres après)", () => {
    expect(parseCurrencyAmount("1,5")).toBe(1.5);
    expect(parseCurrencyAmount("1,50")).toBe(1.5);
    expect(parseCurrencyAmount("1234,56")).toBe(1234.56);
  });

  it("accepte le point décimal (US) et les séparateurs de milliers", () => {
    expect(parseCurrencyAmount("1.5")).toBe(1.5);
    expect(parseCurrencyAmount("1.500")).toBe(1500);
    expect(parseCurrencyAmount("1,234.56")).toBe(1234.56);
    expect(parseCurrencyAmount("1.234,56")).toBe(1234.56);
  });

  it("gère les milliers multiples", () => {
    expect(parseCurrencyAmount("1,234,567")).toBe(1234567);
    expect(parseCurrencyAmount("1.234.567")).toBe(1234567);
  });

  it("rejette une saisie non-numérique (« abc »)", () => {
    expect(parseCurrencyAmount("abc")).toBeNull();
    expect(parseCurrencyAmount(",")).toBeNull();
    expect(parseCurrencyAmount("")).toBeNull();
    expect(parseCurrencyAmount(null)).toBeNull();
    expect(parseCurrencyAmount(NaN)).toBeNull();
  });

  it("gère les entrées déjà numériques", () => {
    expect(parseCurrencyAmount(1500)).toBe(1500);
    expect(parseCurrencyAmount("42")).toBe(42);
  });

  it("borne les décimales à 2 chiffres (arrondi) pour les entrées numériques", () => {
    expect(parseCurrencyAmount(1.2345)).toBe(1.23);
    expect(parseCurrencyAmount(1.994)).toBe(1.99);
    // 4+ chiffres après le séparateur => milliers (pas des décimales) :
    expect(parseCurrencyAmount("1,2345")).toBe(12345);
  });
});

describe("validateFormSubmission — règle currency (T7)", () => {
  const def = (fields: FormFieldDefinition[]): FormDefinition => ({
    id: "f1",
    orgId: "org-1",
    key: "k",
    name: "Test",
    version: 1,
    status: "PUBLISHED",
    fields,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }) as FormDefinition;

  it("rejette « abc » dans un champ currency", () => {
    const { valid, errors } = validateFormSubmission(
      def([{ key: "montant", label: "Montant", type: "currency", required: false, order: 0 }]),
      { montant: "abc" },
    );
    expect(valid).toBe(false);
    expect(errors.join(" ")).toMatch(/montant invalide/i);
  });

  it("accepte « 1,500 » dans un champ currency", () => {
    const { valid } = validateFormSubmission(
      def([{ key: "montant", label: "Montant", type: "currency", required: false, order: 0 }]),
      { montant: "1,500" },
    );
    expect(valid).toBe(true);
  });

  it("accepte une valeur déjà normalisée (number) dans un champ currency", () => {
    const { valid } = validateFormSubmission(
      def([{ key: "montant", label: "Montant", type: "currency", required: false, order: 0 }]),
      { montant: 1500 },
    );
    expect(valid).toBe(true);
  });
});
