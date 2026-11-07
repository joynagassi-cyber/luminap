// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { randomUUID } from "@/lib/uuid";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("randomUUID — compatibilité WebView", () => {
  it("utilise crypto.randomUUID quand disponible", () => {
    const out = randomUUID();
    expect(out).toMatch(UUID_RE);
  });

  it("replie sur getRandomValues si randomUUID est absent", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: real.getRandomValues.bind(real),
    });
    const out = randomUUID();
    expect(out).toMatch(UUID_RE);
  });

  it("replie sur Math.random si aucune source crypto", () => {
    vi.stubGlobal("crypto", undefined);
    const out = randomUUID();
    expect(out).toMatch(UUID_RE);
  });

  it("produit des identifiants uniques (pas de collision évidente)", () => {
    const set = new Set(Array.from({ length: 500 }, () => randomUUID()));
    expect(set.size).toBe(500);
  });
});
