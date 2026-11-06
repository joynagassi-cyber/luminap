// @vitest-environment jsdom
/**
 * Façade plateforme — ouverture de liens externes (`src/platform/openExternal.ts`).
 *
 * Contrat : natif → `@capacitor/browser` ; web → `window.open`, repli
 * `location.assign` si le popup est bloqué. Ne lève jamais.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockBrowser } = vi.hoisted(() => ({
  mockBrowser: { open: vi.fn() },
}));

let native = true;
vi.mock("@capacitor/browser", () => ({ Browser: mockBrowser }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

import { openExternal } from "@/platform/openExternal";

describe("openExternal — façade plateforme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("natif : délègue à @capacitor/browser", async () => {
    await openExternal("https://example.com/doc.pdf");
    expect(mockBrowser.open).toHaveBeenCalledWith({
      url: "https://example.com/doc.pdf",
    });
  });

  it("web : ouvre un nouvel onglet via window.open", async () => {
    native = false;
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    await openExternal("https://example.com");
    expect(open).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("web : repli location.assign si le popup est bloqué", async () => {
    native = false;
    vi.spyOn(window, "open").mockReturnValue(null);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, assign },
    });
    await openExternal("https://example.com/blocked");
    expect(assign).toHaveBeenCalledWith("https://example.com/blocked");
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("natif : repli web si le plugin browser échoue (ne lève pas)", async () => {
    mockBrowser.open.mockRejectedValueOnce(new Error("unavailable"));
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    await expect(openExternal("https://example.com")).resolves.toBeUndefined();
    expect(open).toHaveBeenCalled();
  });
});
