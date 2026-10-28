// @vitest-environment jsdom
/**
 * Garde des drapeaux de fonctionnalités (PR7, Phase 11).
 *
 * Deux propriétés doivent tenir, car un kill switch qui se trompe est pire que
 * pas de kill switch :
 *   1. FAIL-OPEN — un drapeau absent, vide, illisible ou non booléen ne doit
 *      JAMAIS éteindre une fonctionnalité par accident ;
 *   2. DÉSACTIVATION RÉELLE — un drapeau explicitement `false` doit couper la
 *      fonctionnalité, et la surcharge locale doit primer sur la config de build.
 *
 * On teste aussi la robustesse du stockage (indisponible / JSON corrompu) car
 * c'est exactement le scénario d'un appareil en production.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseFlags,
  isFeatureEnabled,
  setLocalFlag,
  localFlags,
  getAllLocalFlags,
  FLAGS_STORAGE_KEY,
} from "@/lib/featureFlags";

describe("parseFlags (fail-open)", () => {
  it("objet booléen valide → conservé", () => {
    expect(parseFlags({ a: true, b: false })).toEqual({ a: true, b: false });
  });

  it("chaîne JSON valide → parsée", () => {
    expect(parseFlags('{"a": false}')).toEqual({ a: false });
  });

  it("entrée vide / null / undefined → aucun drapeau", () => {
    expect(parseFlags("")).toEqual({});
    expect(parseFlags("   ")).toEqual({});
    expect(parseFlags(null)).toEqual({});
    expect(parseFlags(undefined)).toEqual({});
  });

  it("JSON corrompu → aucun drapeau (jamais d'exception)", () => {
    expect(parseFlags("{oops")).toEqual({});
  });

  it("tableau ou scalaire → ignoré", () => {
    expect(parseFlags("[1,2]")).toEqual({});
    expect(parseFlags("42")).toEqual({});
  });

  it("valeurs non booléennes → ignorées (fail-open)", () => {
    expect(parseFlags({ a: "false", b: 0, c: null, d: false })).toEqual({
      d: false,
    });
  });
});

describe("isFeatureEnabled (fail-open)", () => {
  it("drapeau inconnu → ACTIF", () => {
    expect(isFeatureEnabled("nope", {})).toBe(true);
  });

  it("drapeau explicité true → actif", () => {
    expect(isFeatureEnabled("x", { x: true })).toBe(true);
  });

  it("drapeau explicitement false → COUPÉ", () => {
    expect(isFeatureEnabled("x", { x: false })).toBe(false);
  });

  it("valeur non booléenne (déjà filtrée) → actif", () => {
    expect(isFeatureEnabled("x", {} as Record<string, boolean>)).toBe(true);
  });
});

describe("setLocalFlag / surcharge locale", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("coupe une fonctionnalité localement", () => {
    setLocalFlag("sync", false);
    expect(localFlags()).toEqual({ sync: false });
    expect(isFeatureEnabled("sync", localFlags())).toBe(false);
  });

  it("la surcharge locale prime sur la config de build", () => {
    setLocalFlag("sync", false);
    // La config de build dit « actif », la surcharge locale dit « coupé ».
    const merged = { sync: true, ...localFlags() };
    expect(isFeatureEnabled("sync", merged)).toBe(false);
  });

  it("retirer la surcharge (undefined) restaure la valeur de build", () => {
    setLocalFlag("sync", false);
    setLocalFlag("sync", undefined);
    expect(localFlags()).toEqual({});
  });

  it("stockage indisponible → aucune exception (fail-open)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    expect(() => setLocalFlag("sync", false)).not.toThrow();
    spy.mockRestore();
  });

  it("getAllLocalFlags lit la clé dédiée", () => {
    localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify({ a: false }));
    expect(getAllLocalFlags()).toEqual({ a: false });
  });
});

describe("câblage réel (anti « filet déclaré, jamais câblé »)", () => {
  // Classe de défaut récidivante (R105/R106/R107/R108) : un garde-fou existe
  // mais aucune donnée ne l'alimente. On verrouille ici le point d'étranglement
  // réellement gardé par le drapeau `notifications-push`.
  it("initOneSignal est gardé par isFeatureEnabled('notifications-push')", () => {
    const src = readFileSync(
      resolve(__dirname, "../onesignal.ts"),
      "utf8",
    );
    expect(src).toMatch(
      /isFeatureEnabled\(\s*["']notifications-push["']\s*\)/,
    );
  });
});
