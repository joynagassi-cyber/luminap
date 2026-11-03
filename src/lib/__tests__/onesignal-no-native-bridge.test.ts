// @vitest-environment jsdom
/**
 * P-01 — `src/lib/onesignal.ts` ne doit plus simuler un pont natif.
 *
 * Défaut d'origine : sur une plateforme native, `getPlugin()` retournait un
 * proxy qui appelait `capacitor.nativeCallback(...)` — une API inexistante sur
 * le pont Capacitor. `initialize()` était synchrone et ne levait donc jamais,
 * `isReady()` mentait, et `requestPermission()` avalait toutes les exceptions
 * et renvoyait `false` : sur Android, le seul chemin de demande de permission
 * de l'application ne pouvait PAS ouvrir la fenêtre système, en silence.
 *
 * On prouve ici (comportement, pas grep) :
 *   1. plus aucune API native inventée n'est appelée, même quand Capacitor est
 *      présent et se dit natif ;
 *   2. sans SDK OneSignal, `initialize()` est un no-op sûr et `isReady()` est
 *      faux (l'appelant sait qu'il n'y a pas de push) ;
 *   3. si un SDK est réellement présent (plugin Cordova), il est utilisé.
 *
 * NON-VACUITÉ : ré-introduire un appel `capacitor.nativeCallback` dans
 * `getPlugin()` ⇒ le test 1 échoue (l'espion est appelé).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("onesignal — plus de pont natif inventé (P-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("Capacitor", {
      isNativePlatform: () => true,
      nativeCallback: vi.fn(),
      plugin: { callbackFromNative: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as any).plugins;
    delete (window as any).OneSignal;
  });

  it("n'appelle AUCUNE API native inventée, et n'est pas « prêt »", async () => {
    const mod = await import("../onesignal");
    const service = mod.getOneSignalService();
    await service.initialize();
    expect((window as any).Capacitor.nativeCallback).not.toHaveBeenCalled();
    expect(
      (window as any).Capacitor.plugin.callbackFromNative,
    ).not.toHaveBeenCalled();
    expect(service.isReady()).toBe(false);
  });

  it("requestPermission renvoie false sans SDK (pas de mensonge, pas de crash)", async () => {
    const mod = await import("../onesignal");
    const service = mod.getOneSignalService();
    expect(await service.requestPermission()).toBe(false);
  });

  it("utilise le SDK réel quand il est présent (plugin Cordova)", async () => {
    const initialize = vi.fn();
    (window as any).plugins = { OneSignal: { initialize, Login: vi.fn() } };
    const mod = await import("../onesignal");
    const service = mod.getOneSignalService();
    await service.initialize();
    expect(initialize).toHaveBeenCalledWith(
      expect.anything(), // l'App ID vient de VITE_ONESIGNAL_APP_ID
    );
  });
});
