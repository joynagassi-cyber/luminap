import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ASK_AGAIN_DELAY_MS,
  computeShouldAsk,
  isPrimerEligible,
  mapDisplayToStatus,
  permissions,
} from "../permissionService";

// ─── Plugins simulés ─────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  native: true,
  prefs: new Map<string, string>(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  openSettings: vi.fn(),
  initOneSignal: vi.fn(async () => undefined),
  reportError: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native },
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: h.checkPermissions,
    requestPermissions: h.requestPermissions,
  },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: h.prefs.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      h.prefs.set(key, value);
    },
  },
}));
vi.mock("capacitor-native-settings", () => ({
  NativeSettings: { open: h.openSettings },
  AndroidSettings: { ApplicationDetails: "application_details" },
  IOSSettings: { App: "app" },
}));
vi.mock("@/lib/onesignal", () => ({ initOneSignal: h.initOneSignal }));
vi.mock("@/lib/observability/errorReporter", () => ({
  reportError: h.reportError,
}));

const ASKED_KEY = "lumina.perm.notif.askedAt";
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  h.native = true;
  h.prefs.clear();
  vi.clearAllMocks();
  h.initOneSignal.mockResolvedValue(undefined);
  h.openSettings.mockResolvedValue(undefined);
});

// ─── Logique pure ────────────────────────────────────────────────────

describe("mapDisplayToStatus", () => {
  it("traduit les états Capacitor en statuts produit", () => {
    expect(mapDisplayToStatus("granted", false)).toBe("granted");
    expect(mapDisplayToStatus("prompt", false)).toBe("prompt");
    expect(mapDisplayToStatus("prompt-with-rationale", true)).toBe("prompt");
    expect(mapDisplayToStatus("denied", false)).toBe("denied");
    expect(mapDisplayToStatus("valeur-inconnue", false)).toBe("unavailable");
  });

  it("un refus après une demande déjà faite vaut blocage (réglages)", () => {
    expect(mapDisplayToStatus("denied", true)).toBe("blocked");
  });
});

describe("computeShouldAsk", () => {
  const now = 1_800_000_000_000;

  it("ne propose jamais si accordé, bloqué ou indisponible", () => {
    for (const status of ["granted", "blocked", "unavailable"] as const) {
      expect(computeShouldAsk({ status, lastInteractionAt: null, now })).toBe(
        false,
      );
    }
  });

  it("propose si jamais demandé", () => {
    expect(
      computeShouldAsk({ status: "prompt", lastInteractionAt: null, now }),
    ).toBe(true);
    expect(
      computeShouldAsk({ status: "denied", lastInteractionAt: null, now }),
    ).toBe(true);
  });

  it("respecte le délai de 7 jours, borne incluse", () => {
    expect(
      computeShouldAsk({
        status: "prompt",
        lastInteractionAt: now - 3 * DAY_MS,
        now,
      }),
    ).toBe(false);
    expect(
      computeShouldAsk({
        status: "prompt",
        lastInteractionAt: now - ASK_AGAIN_DELAY_MS + 1,
        now,
      }),
    ).toBe(false);
    expect(
      computeShouldAsk({
        status: "prompt",
        lastInteractionAt: now - ASK_AGAIN_DELAY_MS,
        now,
      }),
    ).toBe(true);
    expect(
      computeShouldAsk({
        status: "denied",
        lastInteractionAt: now - 8 * DAY_MS,
        now,
      }),
    ).toBe(true);
  });
});

describe("isPrimerEligible", () => {
  const base = {
    isNative: true,
    status: "prompt" as const,
    lastInteractionAt: null,
    now: 1_800_000_000_000,
    hasTransaction: true,
    routeEligible: true,
  };

  it("exige la conjonction complète (natif + bénéfice vécu + écran calme)", () => {
    expect(isPrimerEligible(base)).toBe(true);
    expect(isPrimerEligible({ ...base, isNative: false })).toBe(false);
    expect(isPrimerEligible({ ...base, hasTransaction: false })).toBe(false);
    expect(isPrimerEligible({ ...base, routeEligible: false })).toBe(false);
    expect(isPrimerEligible({ ...base, status: "granted" })).toBe(false);
    expect(
      isPrimerEligible({ ...base, lastInteractionAt: base.now - DAY_MS }),
    ).toBe(false);
  });
});

// ─── Service (plugins simulés) ───────────────────────────────────────

describe("check", () => {
  it("retourne unavailable sur le web, sans toucher aux plugins", async () => {
    h.native = false;
    await expect(permissions.check("notifications")).resolves.toBe(
      "unavailable",
    );
    expect(h.checkPermissions).not.toHaveBeenCalled();
  });

  it("prompt natif si jamais demandé ; blocked après un refus connu", async () => {
    h.checkPermissions.mockResolvedValue({ display: "prompt" });
    await expect(permissions.check("notifications")).resolves.toBe("prompt");

    h.prefs.set(ASKED_KEY, String(Date.now()));
    h.checkPermissions.mockResolvedValue({ display: "denied" });
    await expect(permissions.check("notifications")).resolves.toBe("blocked");
  });

  it("ne rejette jamais : erreur plugin → unavailable + reportError", async () => {
    h.checkPermissions.mockRejectedValue(new Error("plugin absent"));
    await expect(permissions.check("notifications")).resolves.toBe(
      "unavailable",
    );
    expect(h.reportError).toHaveBeenCalledTimes(1);
  });
});

describe("request", () => {
  it("initialise OneSignal, demande, mémorise et retourne le statut frais", async () => {
    h.requestPermissions.mockResolvedValue({ display: "granted" });
    h.checkPermissions.mockResolvedValue({ display: "granted" });

    await expect(permissions.request("notifications")).resolves.toBe(
      "granted",
    );
    expect(h.initOneSignal).toHaveBeenCalledTimes(1);
    expect(h.requestPermissions).toHaveBeenCalledTimes(1);
    expect(h.prefs.has(ASKED_KEY)).toBe(true);
  });

  it("sur le web : unavailable, aucun appel natif", async () => {
    h.native = false;
    await expect(permissions.request("notifications")).resolves.toBe(
      "unavailable",
    );
    expect(h.requestPermissions).not.toHaveBeenCalled();
    expect(h.initOneSignal).not.toHaveBeenCalled();
  });
});

describe("shouldAsk + recordDeferral", () => {
  it("vrai à l'installation fraîche, faux juste après un « plus tard »", async () => {
    h.checkPermissions.mockResolvedValue({ display: "prompt" });
    await expect(permissions.shouldAsk("notifications")).resolves.toBe(true);

    await permissions.recordDeferral("notifications");
    await expect(permissions.shouldAsk("notifications")).resolves.toBe(false);
  });

  it("faux dès que la permission est accordée", async () => {
    h.checkPermissions.mockResolvedValue({ display: "granted" });
    await expect(permissions.shouldAsk("notifications")).resolves.toBe(false);
  });
});

describe("openAppSettings", () => {
  it("ouvre les réglages de l'application en natif", async () => {
    await permissions.openAppSettings();
    expect(h.openSettings).toHaveBeenCalledWith({
      optionAndroid: "application_details",
      optionIOS: "app",
    });
  });

  it("no-op sur le web", async () => {
    h.native = false;
    await permissions.openAppSettings();
    expect(h.openSettings).not.toHaveBeenCalled();
  });
});
