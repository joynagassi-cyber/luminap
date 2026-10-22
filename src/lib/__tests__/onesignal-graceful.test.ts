import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Non-régression : sans VITE_ONESIGNAL_APP_ID (cas CI / dev sans config push),
 * les modules OneSignal doivent se charger SANS lever et se comporter en no-op.
 *
 * Le bug d'origine : `authOneSignal.ts` faisait `throw` au chargement du module,
 * ce qui faisait planter tout chunk l'important (AuthPage, AppContext) — y
 * compris des specs Cypress sans rapport avec les notifications. Résultat : CI
 * rouge avec « [authOneSignal] VITE_ONESIGNAL_APP_ID manquante ».
 */
describe("OneSignal — dégradation gracieuse sans App ID", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_ONESIGNAL_APP_ID", "");
  });

  it("getOneSignalService() retourne un service no-op (pas de throw)", async () => {
    const { getOneSignalService } = await import("../onesignal");
    expect(() => getOneSignalService()).not.toThrow();
    const service = getOneSignalService();
    expect(service.isReady()).toBe(false);
  });

  it("toutes les opérations sont des no-op sûrs (aucun crash)", async () => {
    const { getOneSignalService } = await import("../onesignal");
    const service = getOneSignalService();

    await expect(service.initialize()).resolves.toBeUndefined();
    await expect(service.login("user-1")).resolves.toBeUndefined();
    await expect(service.setTag("role", "MEMBRE")).resolves.toBeUndefined();
    await expect(service.requestPermission()).resolves.toBe(false);
    await expect(service.getUserId()).resolves.toBeNull();
    await expect(service.logout()).resolves.toBeUndefined();
  });

  it("authOneSignal s'importe sans lever quand l'App ID est absent", async () => {
    // L'import échouait avant le fix (throw au niveau module).
    await expect(import("../authOneSignal")).resolves.toBeDefined();
    const { oneSignalService } = await import("../authOneSignal");
    expect(oneSignalService).toBeDefined();
    // Le login est non critique : il ne doit jamais propager d'erreur.
    await expect(
      oneSignalService.login("MEMBRE", "user-1"),
    ).resolves.toBeUndefined();
  });
});
