/**
 * A3 — retours haptiques et canal de notification.
 *
 * NON-VACUITÉ :
 *  - si `hapticSuccess` appelait `notification({type: Error})`, le test
 *    « type » échoue ;
 *  - si `haptic*` n'était plus gardé par `isNative()`, le test « no-op hors
 *    natif » échoue (le plugin serait appelé sur le web) ;
 *  - si `ensureNotificationChannel` oubliait `importance: 4`, le canal serait
 *    muet (IMPORTANCE_DEFAULT = 3, pas de heads-up) et le test échoue ;
 *  - si une erreur de canal était propagée, `ensureNotificationChannel`
 *    rejetterait et le test « jamais d'exception » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockHaptics, mockCapacitor, mockChannel, mockReportError } = vi.hoisted(
  () => ({
    mockHaptics: {
      notification: vi.fn(async () => undefined),
      impact: vi.fn(async () => undefined),
    } as any,
    mockCapacitor: { isNativePlatform: vi.fn(() => true) } as any,
    mockChannel: { createChannel: vi.fn(), isNative: vi.fn(() => true) } as any,
    mockReportError: vi.fn(),
  }),
);

vi.mock("@capacitor/core", () => ({ Capacitor: mockCapacitor }));
vi.mock("@capacitor/haptics", () => ({
  Haptics: mockHaptics,
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));
vi.mock("@/lib/observability/errorReporter", () => ({
  reportError: mockReportError,
}));
vi.mock("@/adapters/native", () => ({
  LocalNotificationAdapter: { getInstance: () => mockChannel },
}));

import { hapticError, hapticSuccess, hapticImpact } from "../haptics";
import {
  ensureNotificationChannel,
  DEFAULT_CHANNEL_IMPORTANCE,
} from "../nativePermissions/ensureNotificationChannel";
import { LOCAL_NOTIFICATION_CHANNEL_ID } from "../../capabilities/notification/channels";

describe("haptics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCapacitor.isNativePlatform.mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("succès → NotificationType.Success", async () => {
    hapticSuccess();
    await Promise.resolve();
    expect(mockHaptics.notification).toHaveBeenCalledWith({
      type: "SUCCESS",
    });
  });

  it("erreur → NotificationType.Error", async () => {
    hapticError();
    await Promise.resolve();
    expect(mockHaptics.notification).toHaveBeenCalledWith({ type: "ERROR" });
  });

  it("impact léger par défaut", async () => {
    hapticImpact();
    await Promise.resolve();
    expect(mockHaptics.impact).toHaveBeenCalledWith({ style: "LIGHT" });
  });

  it("hors natif : aucun appel au plugin (no-op)", () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    hapticSuccess();
    hapticError();
    hapticImpact();
    expect(mockHaptics.notification).not.toHaveBeenCalled();
    expect(mockHaptics.impact).not.toHaveBeenCalled();
  });

  it("une vibration qui échoue ne lève pas (action métier jamais bloquée)", () => {
    mockHaptics.notification.mockRejectedValueOnce(new Error("no vibrator"));
    expect(() => hapticSuccess()).not.toThrow();
  });
});

describe("ensureNotificationChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.isNative.mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("crée `lumina-default` avec une importance HAUTE (heads-up)", async () => {
    await ensureNotificationChannel();
    expect(mockChannel.createChannel).toHaveBeenCalledTimes(1);
    const arg = mockChannel.createChannel.mock.calls[0][0];
    expect(arg.id).toBe(LOCAL_NOTIFICATION_CHANNEL_ID);
    expect(arg.importance).toBe(DEFAULT_CHANNEL_IMPORTANCE);
    expect(arg.importance).toBe(4);
    expect(arg.name).toBe("Lumina");
  });

  it("hors natif : ne crée rien", async () => {
    mockChannel.isNative.mockReturnValue(false);
    await ensureNotificationChannel();
    expect(mockChannel.createChannel).not.toHaveBeenCalled();
  });

  it("une erreur de canal est journalisée, jamais propagée", async () => {
    mockChannel.createChannel.mockRejectedValueOnce(new Error("boom"));
    await expect(ensureNotificationChannel()).resolves.toBeUndefined();
    expect(mockReportError).toHaveBeenCalled();
  });
});
