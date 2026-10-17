import { describe, it, expect } from "vitest";
import { compareVersions, normalizeTag } from "../checkForUpdate";

describe("compareVersions", () => {
  it("1.10.0 > 1.9.0 (numérique, pas lexicographique)", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
  });

  it("égalité → 0", () => {
    expect(compareVersions("2.0.1", "2.0.1")).toBe(0);
  });

  it("gère moins de 3 composantes (1.0 == 1.0.0)", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });

  it("compare composante par composante", () => {
    expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
    expect(compareVersions("0.9.1", "0.10.0")).toBe(-1);
  });
});

describe("normalizeTag", () => {
  it("retire le préfixe v", () => {
    expect(normalizeTag("v1.4.0")).toBe("1.4.0");
  });

  it("laisse passer un tag sans v", () => {
    expect(normalizeTag("1.4.0")).toBe("1.4.0");
  });
});
