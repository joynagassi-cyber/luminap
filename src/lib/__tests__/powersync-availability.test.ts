// @vitest-environment jsdom
/**
 * P0 — machine d'état de disponibilité PowerSync.
 *
 * Vérifie le filet de sécurité « zéro écran muet » au niveau du module :
 *  - une réplique qui devient prête annule l'état « indisponible » ;
 *  - l'état « indisponible » notifie ses abonnés (une seule fois).
 *
 * Non-vacuité : sans `markPowerSyncUnavailable`, le second cas échoue.
 */
import { describe, it, expect, vi } from "vitest";
import {
  markPowerSyncReady,
  markPowerSyncUnavailable,
  isPowerSyncReadyNow,
  isPowerSyncUnavailableNow,
  subscribePowerSyncUnavailable,
} from "@/lib/dataLayer";

describe("disponibilité PowerSync (P0)", () => {
  it("une réplique prête annule l'état indisponible", () => {
    markPowerSyncUnavailable();
    expect(isPowerSyncUnavailableNow()).toBe(true);
    markPowerSyncReady();
    expect(isPowerSyncReadyNow()).toBe(true);
    expect(isPowerSyncUnavailableNow()).toBe(false);
  });

  it("l'état indisponible notifie ses abonnés une seule fois", () => {
    markPowerSyncReady(); // réinitialise l'état (isolation entre tests)
    const listener = vi.fn();
    const unsub = subscribePowerSyncUnavailable(listener);
    markPowerSyncUnavailable();
    markPowerSyncUnavailable();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });
});
