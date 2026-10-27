// @vitest-environment jsdom
/**
 * Récupération après déploiement (Phase 2) — `installChunkErrorRecovery`.
 *
 * Vite émet `vite:preloadError` quand un chunk dynamique 404 (ancien nom haché
 * après un nouveau déploiement). Sans traitement, l'app reste sur un écran
 * noir. La fonction recharge **une seule fois par session** (garde
 * `sessionStorage`) pour éviter une boucle de rechargement si la cause n'est
 * pas le déploiement. Ce test fige cet invariant.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

import { installChunkErrorRecovery } from "../clientErrors";

const reload = vi.fn();

beforeAll(() => {
  // Un seul écouteur pour tout le fichier (la fonction n'expose pas de cleanup) :
  // l'isolation se fait via sessionStorage.clear() + reload.mockReset().
  installChunkErrorRecovery();
});

beforeEach(() => {
  sessionStorage.clear();
  reload.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...window.location, reload },
  });
});

describe("installChunkErrorRecovery", () => {
  it("recharge une fois sur `vite:preloadError` et pose le drapeau de session", () => {
    window.dispatchEvent(new Event("vite:preloadError"));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("lumina-chunk-reloaded")).toBe("1");
  });

  it("ne boucle pas : un second échec dans la même session ne recharge pas", () => {
    window.dispatchEvent(new Event("vite:preloadError"));
    window.dispatchEvent(new Event("vite:preloadError"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("un événement non lié au chunk ne déclenche aucun rechargement", () => {
    window.dispatchEvent(new Event("resize"));
    expect(reload).not.toHaveBeenCalled();
  });
});
