/**
 * PermissionService — non-vacuité documentée :
 *  - si `resolveStatus` cesse de promouvoir `denied` en `blocked` au 2ᵉ refus,
 *    le test « refus définitif » échoue ;
 *  - si `request()` n'enregistre plus le refus, le compteur reste à 0 et le test
 *    « blocage après deux refus » échoue ;
 *  - si `shouldAsk` ignore le report, le test « Plus tard » échoue ;
 *  - si `request()` est appelée hors natif et prétend `granted`, le test
 *    « web = indisponible » échoue ;
 *  - si `openAppSettings` avale l'absence du plugin natif, le test de
 *    signalement échoue (une permission bloquée resterait sans issue).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockPush, mockPreferences, mockReportError } = vi.hoisted(() => ({
  mockPush: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  } as any,
  mockPreferences: {
    get: vi.fn(),
    set: vi.fn(),
  } as any,
  mockReportError: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    Plugins: {},
  },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: mockPush,
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: mockPreferences,
}));

vi.mock("@/lib/observability/errorReporter", () => ({
  reportError: mockReportError,
}));

import { Capacitor } from "@capacitor/core";
import {
  PermissionService,
  resolveStatus,
  isSnoozed,
  MAX_DENIALS_BEFORE_BLOCKED,
  SNOOZE_DAYS,
} from "../nativePermissions/nativePermissionService";

const native = Capacitor.isNativePlatform as unknown as ReturnType<typeof vi.fn>;

describe("resolveStatus", () => {
  it("mappe les états bruts du plugin", () => {
    expect(resolveStatus("granted", 0)).toBe("granted");
    expect(resolveStatus("prompt", 0)).toBe("prompt");
    expect(resolveStatus("prompt-with-rationale", 0)).toBe("prompt");
    expect(resolveStatus("denied", 0)).toBe("denied");
    expect(resolveStatus("denied", 1)).toBe("denied");
    expect(resolveStatus(undefined, 0)).toBe("unavailable");
  });

  it("promeut `denied` en `blocked` après deux refus (Android ne redemande plus)", () => {
    expect(resolveStatus("denied", MAX_DENIALS_BEFORE_BLOCKED)).toBe("blocked");
    expect(resolveStatus("denied", 5)).toBe("blocked");
  });
});

describe("isSnoozed", () => {
  it("est vrai seulement si la date de report est dans le futur", () => {
    const now = 1_000;
    expect(isSnoozed(now + 1, now)).toBe(true);
    expect(isSnoozed(now - 1, now)).toBe(false);
    expect(isSnoozed(null, now)).toBe(false);
  });
});

describe("PermissionService", () => {
  let service: PermissionService;
  const store = new Map<string, string>();

  beforeEach(() => {
    service = new PermissionService();
    store.clear();
    vi.clearAllMocks();
    native.mockReturnValue(true);
    mockPreferences.get.mockImplementation(async ({ key }: { key: string }) => ({
      value: store.get(key) ?? null,
    }));
    mockPreferences.set.mockImplementation(
      async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      },
    );
    mockPush.checkPermissions.mockResolvedValue({ receive: "prompt" });
    mockPush.requestPermissions.mockResolvedValue({ receive: "granted" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hors natif : check et request renvoient `unavailable`, sans toucher au plugin", async () => {
    native.mockReturnValue(false);
    expect(await service.check("notifications")).toBe("unavailable");
    expect(await service.request("notifications")).toBe("unavailable");
    expect(mockPush.checkPermissions).not.toHaveBeenCalled();
    expect(mockPush.requestPermissions).not.toHaveBeenCalled();
  });

  it("une permission sans objet (camera, exactAlarm) est `unavailable` — jamais demandée", async () => {
    expect(await service.check("camera")).toBe("unavailable");
    expect(await service.request("exactAlarm")).toBe("unavailable");
    expect(mockPush.requestPermissions).not.toHaveBeenCalled();
  });

  it("request() renvoie `granted` et remet le compteur de refus à zéro", async () => {
    store.set("lumina-perm-denials-notifications", "1");
    mockPush.requestPermissions.mockResolvedValue({ receive: "granted" });
    expect(await service.request("notifications")).toBe("granted");
    expect(await service.denials("notifications")).toBe(0);
  });

  it("un refus incrémente le compteur ; deux refus ⇒ `blocked`", async () => {
    mockPush.requestPermissions.mockResolvedValue({ receive: "denied" });
    expect(await service.request("notifications")).toBe("denied");
    expect(await service.denials("notifications")).toBe(1);
    expect(await service.request("notifications")).toBe("blocked");
    // Comportement Android réel : après un refus définitif, `checkPermissions`
    // continue de renvoyer `denied` (la fenêtre ne peut plus s'afficher). C'est
    // le compteur de refus qui promeut l'état en `blocked`.
    mockPush.checkPermissions.mockResolvedValue({ receive: "denied" });
    expect(await service.check("notifications")).toBe("blocked");
  });

  it("n'ouvre AUCUNE fenêtre si la permission est déjà accordée", async () => {
    mockPush.checkPermissions.mockResolvedValue({ receive: "granted" });
    expect(await service.request("notifications")).toBe("granted");
    expect(mockPush.requestPermissions).not.toHaveBeenCalled();
  });

  it("`blocked` : aucune nouvelle demande système (Android ne l'afficherait pas)", async () => {
    store.set("lumina-perm-denials-notifications", "2");
    mockPush.checkPermissions.mockResolvedValue({ receive: "denied" });
    expect(await service.request("notifications")).toBe("blocked");
    expect(mockPush.requestPermissions).not.toHaveBeenCalled();
  });

  it("shouldAsk : faux si accordé, bloqué, indisponible, ou reporté", async () => {
    mockPush.checkPermissions.mockResolvedValue({ receive: "granted" });
    expect(await service.shouldAsk("notifications")).toBe(false);

    mockPush.checkPermissions.mockResolvedValue({ receive: "prompt" });
    expect(await service.shouldAsk("notifications")).toBe(true);

    await service.snooze("notifications");
    expect(await service.shouldAsk("notifications")).toBe(false);

    store.set(
      "lumina-perm-snooze-notifications",
      String(Date.now() - SNOOZE_DAYS * 86_400_000),
    );
    expect(await service.shouldAsk("notifications")).toBe(true);
  });

  it("shouldAsk : faux quand Android a bloqué (2 refus)", async () => {
    store.set("lumina-perm-denials-notifications", "2");
    mockPush.checkPermissions.mockResolvedValue({ receive: "denied" });
    expect(await service.shouldAsk("notifications")).toBe(false);
  });

  it("signale l'absence de `openAppSettings` natif au lieu d'échouer en silence", async () => {
    expect(await service.openAppSettings()).toBe(false);
    expect(mockReportError).toHaveBeenCalled();
  });

  it("remonte les erreurs du plugin au lieu de les avaler", async () => {
    mockPush.checkPermissions.mockRejectedValue(new Error("boom"));
    expect(await service.check("notifications")).toBe("unavailable");
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: "permissions.check" }),
    );
  });
});
