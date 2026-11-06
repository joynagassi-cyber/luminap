// @vitest-environment jsdom
/**
 * Façade plateforme — feuille de partage (`src/platform/shareLink.ts`).
 *
 * Contrat : natif → `@capacitor/share` ; web → `navigator.share` ;
 * « unsupported » si aucun canal (l'appelant gère le repli).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockShare } = vi.hoisted(() => ({ mockShare: { share: vi.fn() } }));

let native = true;
vi.mock("@capacitor/share", () => ({ Share: mockShare }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

import { shareLink } from "@/platform/shareLink";

describe("shareLink — façade plateforme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native = true;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as Navigator & { share?: unknown }).share;
  });

  it("natif : délègue à @capacitor/share", async () => {
    const outcome = await shareLink({ url: "https://x/doc.pdf", title: "Doc" });
    expect(mockShare.share).toHaveBeenCalledWith({
      url: "https://x/doc.pdf",
      title: "Doc",
    });
    expect(outcome).toBe("shared");
  });

  it("web : utilise navigator.share si disponible", async () => {
    native = false;
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> };
    const spy = vi.fn().mockResolvedValue(undefined);
    nav.share = spy;
    const outcome = await shareLink({ url: "https://x" });
    expect(spy).toHaveBeenCalledWith({ url: "https://x" });
    expect(outcome).toBe("shared");
  });

  it("web sans Web Share : renvoie « unsupported »", async () => {
    native = false;
    const outcome = await shareLink({ url: "https://x" });
    expect(outcome).toBe("unsupported");
  });

  it("propage l'annulation utilisateur (AbortError)", async () => {
    native = false;
    const nav = navigator as Navigator & { share?: (d: unknown) => Promise<void> };
    nav.share = vi.fn().mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );
    await expect(shareLink({ url: "https://x" })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
