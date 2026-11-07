// @vitest-environment jsdom
/**
 * Façade plateforme — presse-papiers (`src/platform/clipboard.ts`).
 *
 * Contrat : natif → `@capacitor/clipboard` ; web → `navigator.clipboard` ;
 * `false` si aucun canal (l'appelant gère le repli).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockWrite } = vi.hoisted(() => ({ mockWrite: { write: vi.fn() } }));

let native = true;
vi.mock("@capacitor/clipboard", () => ({ Clipboard: mockWrite }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

import { copyText } from "@/platform/clipboard";

describe("copyText — façade plateforme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native = true;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
  });

  it("natif : délègue à @capacitor/clipboard", async () => {
    await expect(copyText("bonjour")).resolves.toBe(true);
    expect(mockWrite.write).toHaveBeenCalledWith({ string: "bonjour" });
  });

  it("web : utilise navigator.clipboard si disponible", async () => {
    native = false;
    const spy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: spy },
      configurable: true,
    });
    await expect(copyText("salut")).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith("salut");
  });

  it("web sans navigator.clipboard : renvoie false (pas d'exception)", async () => {
    native = false;
    await expect(copyText("x")).resolves.toBe(false);
  });
});
