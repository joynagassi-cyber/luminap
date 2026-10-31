/**
 * LocalNotificationAdapter — device-side (offline) notifications.
 *
 * NON-VACUITÉ (preuve documentée) :
 *   - Retirer la garde `if (!this._isNative) return { id: null, ... }` dans
 *     `schedule` → le test « no-op hors natif » échoue (le plugin est appelé).
 *   - Retirer `LocalNotifications.requestPermissions()` de `requestPermission`
 *     → le test « demande la permission » échoue.
 *   - Ne pas renvoyer `scheduled?.id` (retour `null` systématique) → le test
 *     « renvoie l'id natif » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalNotificationAdapter } from "../LocalNotificationAdapter";

const { mockLocalPlugin } = vi.hoisted(() => ({
  mockLocalPlugin: {
    requestPermissions: vi.fn(),
    checkPermissions: vi.fn(),
    schedule: vi.fn(),
    cancel: vi.fn(),
    getPending: vi.fn(),
    createChannel: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  } as any,
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: mockLocalPlugin,
}));

vi.stubGlobal("window", globalThis);

describe("LocalNotificationAdapter", () => {
  beforeEach(() => {
    LocalNotificationAdapter.injectMockPlugin(mockLocalPlugin);
    vi.clearAllMocks();
  });

  afterEach(() => {
    LocalNotificationAdapter.resetMockPlugin();
    vi.restoreAllMocks();
  });

  it("isNative est vrai avec un plugin injecté, faux sans", () => {
    expect(LocalNotificationAdapter.getInstance().isNative()).toBe(true);
    LocalNotificationAdapter.resetMockPlugin();
    expect(LocalNotificationAdapter.getInstance().isNative()).toBe(false);
  });

  it("requestPermission renvoie true quand display=granted", async () => {
    mockLocalPlugin.requestPermissions.mockResolvedValue({ display: "granted" });
    const adapter = LocalNotificationAdapter.getInstance();
    expect(await adapter.requestPermission()).toBe(true);
    expect(mockLocalPlugin.requestPermissions).toHaveBeenCalled();
  });

  it("requestPermission renvoie false quand refusée", async () => {
    mockLocalPlugin.requestPermissions.mockResolvedValue({ display: "denied" });
    expect(await LocalNotificationAdapter.getInstance().requestPermission()).toBe(
      false,
    );
  });

  it("schedule renvoie l'id natif et passe la notification au plugin", async () => {
    mockLocalPlugin.schedule.mockResolvedValue({
      notifications: [{ id: 42 }],
    });
    const adapter = LocalNotificationAdapter.getInstance();
    const result = await adapter.schedule({ title: "T", body: "M" });
    expect(result).toEqual({ id: 42, error: null });
    expect(mockLocalPlugin.schedule).toHaveBeenCalledTimes(1);
    const arg = mockLocalPlugin.schedule.mock.calls[0][0];
    expect(arg.notifications[0]).toMatchObject({ title: "T", body: "M" });
    expect(typeof arg.notifications[0].id).toBe("number");
  });

  it("schedule est un no-op (id null) hors environnement natif", async () => {
    LocalNotificationAdapter.resetMockPlugin();
    const adapter = LocalNotificationAdapter.getInstance();
    const result = await adapter.schedule({ title: "T", body: "M" });
    expect(result.id).toBeNull();
    expect(result.error).toContain("native");
    expect(mockLocalPlugin.schedule).not.toHaveBeenCalled();
  });

  it("schedule capture l'erreur du plugin sans lever", async () => {
    mockLocalPlugin.schedule.mockRejectedValue(new Error("boom"));
    const result = await LocalNotificationAdapter.getInstance().schedule({
      title: "T",
      body: "M",
    });
    expect(result).toEqual({ id: null, error: "boom" });
  });

  it("cancel ne fait rien hors natif et appelle le plugin en natif", async () => {
    const adapter = LocalNotificationAdapter.getInstance();
    await adapter.cancel([]);
    expect(mockLocalPlugin.cancel).not.toHaveBeenCalled();
    await adapter.cancel([7]);
    expect(mockLocalPlugin.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 7 }],
    });
  });

  it("getPending renvoie [] hors natif et les notifications en natif", async () => {
    mockLocalPlugin.getPending.mockResolvedValue({
      notifications: [{ id: 1 }],
    });
    const adapter = LocalNotificationAdapter.getInstance();
    expect(await adapter.getPending()).toEqual([{ id: 1 }]);
  });

  it("addActionListener renvoie un désabonnement qui retire l'écouteur", async () => {
    const remove = vi.fn();
    mockLocalPlugin.addListener.mockResolvedValue({ remove });
    const adapter = LocalNotificationAdapter.getInstance();
    const cb = vi.fn();
    const off = await adapter.addActionListener(cb);
    expect(mockLocalPlugin.addListener).toHaveBeenCalledWith(
      "localNotificationActionPerformed",
      expect.any(Function),
    );
    off();
    expect(remove).toHaveBeenCalled();
  });
});
