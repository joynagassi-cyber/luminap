// @vitest-environment jsdom
/**
 * Façade plateforme — bouton retour MATÉRIEL Android (`src/platform/hardwareBack.ts`).
 *
 * Contrat : sur natif, `registerHardwareBack` s'inscrit sur l'événement DOM
 * `ionBackButton` (registre priorisé Ionic) avec une priorité SUPÉRIEURE aux
 * overlays Ionic (100) et au routeur (0) ; le handler ferme l'overlay le plus
 * récent et CONSOMME l'événement (pas de `processNextHandler`). Sur le web,
 * aucun écouteur n'est posé (no-op).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

let native = true;
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

import {
  registerHardwareBack,
  OVERLAY_BACK_PRIORITY,
  __resetHardwareBackForTests,
} from "@/platform/hardwareBack";

/** Simule un appui sur le bouton retour matériel (événement Ionic). */
function fireBackButton() {
  let registered: {
    priority: number;
    handler: (processNextHandler: () => void) => void;
  } | null = null;
  const processNextHandler = vi.fn();
  const ev = new CustomEvent("ionBackButton", {
    detail: {
      register: (
        priority: number,
        handler: (processNextHandler: () => void) => void,
      ) => {
        registered = { priority, handler };
      },
    },
  });
  document.dispatchEvent(ev);
  return { getRegistered: () => registered, processNextHandler };
}

describe("registerHardwareBack — façade plateforme", () => {
  beforeEach(() => {
    native = true;
    __resetHardwareBackForTests();
  });

  it("natif : s'inscrit au-dessus des overlays Ionic et consomme l'événement", () => {
    const onClose = vi.fn();
    const unregister = registerHardwareBack(onClose);

    const { getRegistered, processNextHandler } = fireBackButton();
    const reg = getRegistered();
    expect(reg).not.toBeNull();
    expect(reg!.priority).toBeGreaterThan(100); // > overlays Ionic
    expect(reg!.priority).toBe(OVERLAY_BACK_PRIORITY);

    // Ionic appelle le handler : l'overlay se ferme, l'événement est consommé.
    reg!.handler(processNextHandler);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(processNextHandler).not.toHaveBeenCalled();

    unregister();
  });

  it("natif : pile LIFO — le dernier overlay ouvert se ferme en premier", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const u1 = registerHardwareBack(h1);
    const u2 = registerHardwareBack(h2);

    // 1er appui : l'overlay du dessus (h2) se ferme → désinscription (démontage).
    fireBackButton().getRegistered()!.handler(vi.fn());
    expect(h2).toHaveBeenCalledTimes(1);
    expect(h1).not.toHaveBeenCalled();
    u2();

    // 2e appui : l'overlay suivant (h1) se ferme.
    fireBackButton().getRegistered()!.handler(vi.fn());
    expect(h1).toHaveBeenCalledTimes(1);

    u1();
  });

  it("natif : désinscription — plus aucun handler une fois la pile vidée", () => {
    const onClose = vi.fn();
    const unregister = registerHardwareBack(onClose);
    unregister();

    const { getRegistered } = fireBackButton();
    expect(getRegistered()).toBeNull();
  });

  it("web : no-op (aucun écouteur posé)", () => {
    native = false;
    const onClose = vi.fn();
    const unregister = registerHardwareBack(onClose);

    const { getRegistered } = fireBackButton();
    expect(getRegistered()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    unregister();
  });
});
