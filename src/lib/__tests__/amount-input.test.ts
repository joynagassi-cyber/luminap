/**
 * Parsing des montants — module partagé `amountInput` (source de vérité).
 *
 * Verrouille le comportement attendu côté SAISIE (pas seulement l'affichage) :
 * la virgule décimale FR et les séparateurs de milliers doivent donner le même
 * montant partout (écrans finance, import CSV, formulaires).
 */
import { describe, it, expect } from "vitest";
import { parseCurrencyAmount, parseAmountToCents } from "@/lib/amountInput";

describe("parseCurrencyAmount", () => {
  it("accepte la virgule décimale FR", () => {
    expect(parseCurrencyAmount("1,50")).toBe(1.5);
    expect(parseCurrencyAmount("1500,5")).toBe(1500.5);
  });

  it("accepte les séparateurs de milliers (espace, point, virgule)", () => {
    expect(parseCurrencyAmount("1 000")).toBe(1000);
    expect(parseCurrencyAmount("1 000,50")).toBe(1000.5);
    expect(parseCurrencyAmount("1.500")).toBe(1500);
    expect(parseCurrencyAmount("1,500")).toBe(1500);
    expect(parseCurrencyAmount("1.234.567")).toBe(1234567);
  });

  it("traite le DERNIER séparateur comme décimal quand les deux sont présents", () => {
    expect(parseCurrencyAmount("1.234,56")).toBe(1234.56);
    expect(parseCurrencyAmount("1,234.56")).toBe(1234.56);
  });

  it("borne à 2 décimales", () => {
    expect(parseCurrencyAmount("1,999")).toBe(1999);
    expect(parseCurrencyAmount("1,99")).toBe(1.99);
    expect(parseCurrencyAmount(12.345)).toBe(12.35);
  });

  it("rejette les saisies invalides (jamais NaN)", () => {
    expect(parseCurrencyAmount("abc")).toBeNull();
    expect(parseCurrencyAmount("")).toBeNull();
    expect(parseCurrencyAmount("   ")).toBeNull();
    expect(parseCurrencyAmount(null)).toBeNull();
    expect(parseCurrencyAmount(NaN)).toBeNull();
  });

  it("accepte déjà un number (déjà normalisé)", () => {
    expect(parseCurrencyAmount(1500)).toBe(1500);
    expect(parseCurrencyAmount(12.345)).toBe(12.35);
  });
});

describe("parseAmountToCents", () => {
  it("convertit en centimes (unité de stockage)", () => {
    expect(parseAmountToCents("1 000,50")).toBe(100050);
    expect(parseAmountToCents("2500")).toBe(250000);
  });

  it("retourne null (pas NaN) pour une saisie invalide", () => {
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
  });
});
