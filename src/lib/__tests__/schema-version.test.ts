/**
 * R106 — le garde-fou « mise à jour requise » ne doit plus être du code mort.
 *
 * Défaut visé : `resolveRoute` produisait `update-required` et `App.tsx` rendait
 * `UpdateRequiredScreen`, mais AUCUNE source ne fournissait `clientSchemaVersion`
 * / `minSchemaVersion` → branche inerte (même classe que R105/R107).
 *
 * Ce test verrouille le câblage côté module (`schemaVersion.ts`) ET le caractère
 * fail-open : sans version minimale déclarée, rien ne bloque.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  CLIENT_SCHEMA_VERSION,
  parseMinSchemaVersion,
  isUpdateRequired,
} from "../schemaVersion";
import { resolveRoute, type RouteState } from "../routeResolver";

describe("parseMinSchemaVersion — fail-open sur valeur invalide", () => {
  it("absent / vide / null → undefined (aucune contrainte)", () => {
    expect(parseMinSchemaVersion(undefined)).toBeUndefined();
    expect(parseMinSchemaVersion(null)).toBeUndefined();
    expect(parseMinSchemaVersion("")).toBeUndefined();
    expect(parseMinSchemaVersion("   ")).toBeUndefined();
  });

  it("non numérique / négatif / non fini → undefined", () => {
    expect(parseMinSchemaVersion("abc")).toBeUndefined();
    expect(parseMinSchemaVersion("-3")).toBeUndefined();
    expect(parseMinSchemaVersion("Infinity")).toBeUndefined();
  });

  it("numérique (chaîne ou nombre) → entier", () => {
    expect(parseMinSchemaVersion("2")).toBe(2);
    expect(parseMinSchemaVersion(3)).toBe(3);
    expect(parseMinSchemaVersion("4.9")).toBe(4);
  });
});

describe("isUpdateRequired — décision pure", () => {
  it("sans version minimale → jamais de blocage (fail-open)", () => {
    expect(isUpdateRequired(1, undefined)).toBe(false);
  });

  it("client plus ancien que le minimum → mise à jour requise", () => {
    expect(isUpdateRequired(1, 2)).toBe(true);
  });

  it("client à jour ou plus récent → pas de blocage", () => {
    expect(isUpdateRequired(2, 2)).toBe(false);
    expect(isUpdateRequired(3, 2)).toBe(false);
  });

  it("CLIENT_SCHEMA_VERSION est un entier positif", () => {
    expect(Number.isInteger(CLIENT_SCHEMA_VERSION)).toBe(true);
    expect(CLIENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("resolveRoute — la version de schéma prime sur tout", () => {
  it("client trop ancien → update-required même sur une route publique", () => {
    const state: RouteState = {
      isAuthenticated: false,
      clientSchemaVersion: 1,
      minSchemaVersion: 2,
    };
    expect(resolveRoute("/auth", state).outcome).toBe("update-required");
  });

  it("minSchemaVersion absente → comportement normal (fail-open)", () => {
    const state: RouteState = {
      isAuthenticated: true,
      clientSchemaVersion: 1,
      minSchemaVersion: undefined,
    };
    expect(resolveRoute("/dashboard", state).outcome).toBe("render");
  });
});

describe("câblage réel dans App.tsx (anti-régression : plus de branche morte)", () => {
  const appSrc = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");

  it("App.tsx alimente clientSchemaVersion depuis CLIENT_SCHEMA_VERSION", () => {
    expect(appSrc).toMatch(/clientSchemaVersion:\s*CLIENT_SCHEMA_VERSION/);
  });

  it("App.tsx alimente minSchemaVersion depuis la config", () => {
    expect(appSrc).toMatch(/minSchemaVersion:\s*resolveMinSchemaVersion\(\)/);
  });

  it("App.tsx importe le module de versionnage", () => {
    expect(appSrc).toMatch(/from\s+"@\/lib\/schemaVersion"/);
  });
});
