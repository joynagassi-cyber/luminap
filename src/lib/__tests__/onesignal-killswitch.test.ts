// @vitest-environment jsdom
/**
 * PR7 — kill switch `notifications-push` : test COMPORTEMENTAL (pas un grep).
 *
 * La garde de `feature-flags.test.ts` se contente de chercher l'appel
 * `isFeatureEnabled("notifications-push")` dans la source ; une garde neutralisée
 * (`if (false && …)`) passerait quand même. On prouve ici le COMPORTEMENT réel :
 * drapeau coupé ⇒ `initOneSignal()` n'initialise pas le service ; drapeau absent
 * (fail-open) ⇒ il initialise.
 *
 * NON-VACUITÉ : remplacer `if (!isFeatureEnabled("notifications-push"))` par
 * `if (false)` dans `onesignal.ts` ⇒ le 1er test échoue (le service est
 * initialisé malgré le drapeau coupé).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("PR7 — kill switch `notifications-push` (comportemental)", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("drapeau coupé ⇒ initOneSignal() n'initialise PAS le service", async () => {
    localStorage.setItem(
      "lumina-flags",
      JSON.stringify({ "notifications-push": false }),
    );
    const mod = await import("../onesignal");
    const service = mod.getOneSignalService();
    const spy = vi.spyOn(service, "initialize").mockResolvedValue();

    await mod.initOneSignal();

    expect(spy).not.toHaveBeenCalled();
  });

  it("drapeau absent (fail-open) ⇒ initOneSignal() initialise le service", async () => {
    const mod = await import("../onesignal");
    const service = mod.getOneSignalService();
    const spy = vi.spyOn(service, "initialize").mockResolvedValue();

    await mod.initOneSignal();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
