/**
 * C-03 (A3) — contrat du service haptique : natif uniquement, jamais
 * d'erreur propagée (le tactile ponctue un flux, il ne le casse pas).
 * Non-vacuité : sans la garde plateforme, le cas web appellerait le
 * plugin ; sans le catch, le rejet simulé deviendrait non géré.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { haptics } from "../haptics";

const h = vi.hoisted(() => ({
  native: true,
  notification: vi.fn(async () => undefined),
  impact: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native },
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { notification: h.notification, impact: h.impact },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
  ImpactStyle: { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" },
}));

beforeEach(() => {
  h.native = true;
  vi.clearAllMocks();
  h.notification.mockResolvedValue(undefined);
  h.impact.mockResolvedValue(undefined);
});

describe("haptics — en natif", () => {
  it("émet les retours attendus (succès / erreur / impact léger)", () => {
    haptics.success();
    expect(h.notification).toHaveBeenCalledWith({ type: "SUCCESS" });

    haptics.error();
    expect(h.notification).toHaveBeenCalledWith({ type: "ERROR" });

    haptics.light();
    expect(h.impact).toHaveBeenCalledWith({ style: "LIGHT" });
  });

  it("ne propage jamais un rejet du plugin", async () => {
    h.notification.mockRejectedValue(new Error("pas de vibreur"));
    expect(() => haptics.success()).not.toThrow();
    // Laisser la promesse rejetée se résoudre dans le catch interne.
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe("haptics — sur le web", () => {
  it("est un no-op total (aucun appel plugin)", () => {
    h.native = false;
    haptics.success();
    haptics.error();
    haptics.light();
    expect(h.notification).not.toHaveBeenCalled();
    expect(h.impact).not.toHaveBeenCalled();
  });
});
