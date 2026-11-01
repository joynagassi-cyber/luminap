/**
 * PR7 — le kill switch `notifications-push` coupe réellement la fonctionnalité
 * de bout en bout (et pas seulement « dans le source »).
 *
 * La garde existante dans `feature-flags.test.ts` ne vérifiait que la PRÉSENCE
 * de `isFeatureEnabled("notifications-push")` dans le TEXTE de `onesignal.ts` —
 * une assertion structurelle qui passerait même si l'appel était neutralisé
 * (`if (false && isFeatureEnabled(...))`). Ici on prouve l'effet OBSERVABLE :
 * drapeau coupé → `initOneSignal()` n'initialise PAS le service ; drapeau actif
 * (défaut, fail-open) → il l'initialise.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const flag = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: () => flag.enabled,
}));

import { getOneSignalService, initOneSignal } from "@/lib/onesignal";

beforeEach(() => {
  flag.enabled = true;
  vi.restoreAllMocks();
});

describe("PR7 — kill switch notifications-push (effet réel)", () => {
  it("drapeau ACTIF (défaut) → le service est initialisé", async () => {
    const service = getOneSignalService();
    const spy = vi.spyOn(service, "initialize").mockResolvedValue(undefined);
    await initOneSignal();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("drapeau COUPÉ → initOneSignal ne touche pas le service (no-op)", async () => {
    const service = getOneSignalService();
    const spy = vi.spyOn(service, "initialize").mockResolvedValue(undefined);
    flag.enabled = false;
    await initOneSignal();
    expect(spy).not.toHaveBeenCalled();
  });
});
