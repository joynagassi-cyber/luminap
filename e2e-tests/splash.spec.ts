import { test, expect } from "@playwright/test";

/**
 * Double splash statique :
 *  - phase 1 : logo Lumina centré (splash-phase-logo) ;
 *  - phase 2 : illustration plate « gestion d'une organisation » au centre
 *    + logo en bas (splash-phase-illustration / splash-illustration) ;
 *  - puis redirection vers onboarding / dashboard / auth (gate conservé).
 *
 * Les deux phases sont courtes (1,2 s / 1,5 s) et démarrent au montage de
 * React — un boot de dev slow peut rendre la capture « live » racy. On
 * enregistre donc la SÉQUENCE des phases observées : un init script sonde le
 * DOM toutes les ~40 ms et persiste la séquence dans localStorage
 * (survit à un rechargement complet du document si le boot est long ou que
 * l'app fait un hard reload). Après la redirection, on lit la séquence et on
 * vérifie l'ordre logo → illustration.
 *
 * Pas de test-user requis : le splash est public et les deux phases
 * s'affichent avant toute navigation.
 */

type ObservedPhase = "logo" | "illustration" | "loading";

const SEQ_KEY = "__splash_seq";

async function readSplashSeq(page: import("@playwright/test").Page) {
  return page.evaluate((key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]") as ObservedPhase[];
    } catch {
      return [] as ObservedPhase[];
    }
  }, SEQ_KEY);
}

test.describe("Splash double phase", () => {
  test("logo puis illustration, puis redirection", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    // Enregistre l'ordre des phases splash observées, quel que soit le
    // moment où le bundle se monte (dev server rapide ou lent). Persistance
    // en localStorage : si le boot est très lent et qu'un hard reload a
    // lieu pendant ce temps, la séquence survit au changement de document.
    await page.addInitScript((key: string) => {
      const w = window as unknown as {
        [key: string]: unknown;
        setInterval: (fn: () => void, ms: number) => number;
        clearInterval: (id: number) => void;
        setTimeout: (fn: () => void, ms: number) => number;
      };
      let seq: ObservedPhase[] = [];
      try {
        seq = JSON.parse(localStorage.getItem(key) || "[]") as ObservedPhase[];
      } catch {
        seq = [];
      }
      let last: ObservedPhase | null = null;

      const probe = () => {
        let cur: ObservedPhase | null = null;
        if (document.querySelector('[data-testid="splash-phase-logo"]'))
          cur = "logo";
        else if (
          document.querySelector('[data-testid="splash-phase-illustration"]')
        )
          cur = "illustration";
        else if (document.querySelector('[data-testid="splash-loading"]'))
          cur = "loading";
        if (cur && cur !== last && !seq.includes(cur)) {
          seq.push(cur);
          last = cur;
          try {
            localStorage.setItem(key, JSON.stringify(seq));
          } catch {
            /* opaque origin — in-memory only */
          }
        }
      };

      probe();
      const timer = w.setInterval(probe, 40);
      // Stop the probe when the page hides/unloads (context teardown
      // otherwise, the interval is cheap and page-scoped).
      const stop = () => w.clearInterval(timer);
      w.addEventListener("pagehide", stop, { once: true });
      w.setTimeout(() => w.clearInterval(timer), 110_000);
    }, SEQ_KEY);

    // `/splash` est la seule route qui affiche la rampe (route publique).
    // Naviguer vers `/` ne ferait que renvoyer vers `/auth` (guard) sans
    // jamais monter le splash. Après la rampe, Splash navigue vers
    // onboarding/dashboard, que la guard redirige ensuite vers /auth.
    await page.goto("/splash", { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Redirection (onboarding / dashboard, ou auth si non connecté) : la
    // navigation a lieu après la rampe des phases (~2,7 s).
    await page.waitForURL(/\/(onboarding|dashboard|auth)/, { timeout: 90_000 });

    const seq = await readSplashSeq(page);

    // La phase logo est affichée…
    expect(
      seq,
      `phases observées: ${JSON.stringify(seq)} (url finale: ${page.url()})`,
    ).toContain("logo");
    // …puis la phase illustration (contenant l'illustration plate).
    expect(
      seq,
      `phases observées: ${JSON.stringify(seq)} (url finale: ${page.url()})`,
    ).toContain("illustration");
    // L'ordre est bien logo AVANT illustration.
    expect(
      seq.indexOf("logo"),
      `ordre des phases observées: ${JSON.stringify(seq)}`,
    ).toBeLessThan(seq.indexOf("illustration"));
  });
});
