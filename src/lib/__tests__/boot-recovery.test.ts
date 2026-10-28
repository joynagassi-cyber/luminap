// @vitest-environment node
/**
 * Récupération de démarrage — garde-fou contre l'écran noir silencieux.
 *
 * Contexte du défaut (2026-10-28) : le splash HTML était masqué sans condition
 * au bout de 6 s. Quand l'évaluation du bundle échouait (`src/lib/auth.ts` lève
 * si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` sont absents), React ne
 * montait jamais, `#root` restait vide, et le fond `#121212` était seul visible
 * → « splash, puis page noire », sans aucune indication de la cause.
 *
 * Ces tests exécutent le VRAI script inline de `index.html` dans un JSDOM, avec
 * des minuteurs neutralisés pour ne pas attendre 6 secondes. Ils vérifient le
 * comportement, pas la présence d'une chaîne de caractères dans le fichier.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const ROOT = resolve(import.meta.dirname, "../../..");
const HTML = readFileSync(resolve(ROOT, "index.html"), "utf8");

/** Scripts inline de index.html, dans l'ordre d'exécution. */
function inlineScripts(): string[] {
  return [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1],
  );
}

/**
 * Monte le document et exécute ses scripts inline avec des minuteurs capturés
 * (aucune attente réelle). Renvoie de quoi déclencher les rappels à la main.
 */
function boot(options: { alreadyHydrated?: boolean } = {}) {
  // `outside-only` : le document est parsé mais ses <script> ne s'exécutent pas
  // tout seuls ; on les évalue nous-mêmes dans le realm de la fenêtre, après
  // avoir neutralisé les minuteurs.
  const dom = new JSDOM(HTML, { url: "https://lumina.test/", runScripts: "outside-only" });
  const w = dom.window as unknown as Window & typeof globalThis;

  const timeouts: Array<() => void> = [];
  const intervals: Array<() => void> = [];
  w.setTimeout = ((fn: () => void) => {
    timeouts.push(fn);
    return 0;
  }) as never;
  w.clearTimeout = (() => {}) as never;
  w.setInterval = ((fn: () => void) => {
    intervals.push(fn);
    return 0;
  }) as never;
  w.clearInterval = (() => {}) as never;

  if (options.alreadyHydrated) {
    dom.window.document.getElementById("root")!.classList.add("is-hydrated");
  }

  for (const src of inlineScripts()) {
    // `runScripts` reste désactivé : on exécute nous-mêmes, dans le contexte
    // de la fenêtre, après avoir neutralisé les minuteurs.
    (w as unknown as { eval: (s: string) => void }).eval(src);
  }

  const doc = dom.window.document;
  return {
    window: dom.window,
    doc,
    overlay: () => doc.getElementById("lumina-boot-recovery"),
    splash: () => doc.querySelector(".splash-splash-html") as HTMLElement | null,
    fireTimeouts: () => timeouts.forEach((fn) => fn()),
    fireIntervals: () => intervals.forEach((fn) => fn()),
    ready: () => doc.getElementById("root")!.classList.add("is-hydrated"),
  };
}

describe("démarrage — échec du bundle", () => {
  it("affiche un diagnostic au lieu d'un écran noir", () => {
    const app = boot();
    app.fireTimeouts();

    const overlay = app.overlay();
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute("role")).toBe("alert");
    expect(overlay!.textContent).toContain("n'a pas pu démarrer");
    // Le splash ne reste pas collé par-dessus le diagnostic.
    expect(app.splash()!.style.display).toBe("none");
  });

  it("remonte la cause réelle quand une erreur de module est levée", () => {
    const app = boot();
    const cause =
      "[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes : " +
      "l'authentification ne peut pas fonctionner sans Supabase.";

    // C'est ce que le navigateur émet quand l'évaluation d'un module échoue.
    app.window.dispatchEvent(
      new app.window.ErrorEvent("error", { message: cause }),
    );
    app.fireTimeouts();

    expect(app.overlay()!.textContent).toContain("VITE_SUPABASE_URL");
    expect(app.overlay()!.textContent).toContain("manquantes");
  });

  it("capture aussi une promesse rejetée non gérée", () => {
    const app = boot();
    app.window.dispatchEvent(
      new app.window.Event("unhandledrejection") as never,
    );
    app.fireTimeouts();
    // Sans message exploitable, on retombe sur le diagnostic générique.
    expect(app.overlay()!.textContent).toContain("n'a pas pu démarrer");
  });

  it("propose un rechargement (aucune impasse pour l'utilisateur)", () => {
    const app = boot();
    app.fireTimeouts();
    const btn = app.overlay()!.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toMatch(/Recharger/i);
    expect(btn!.getAttribute("type")).toBe("button");
  });
});

describe("démarrage — succès, ou succès tardif", () => {
  it("ne montre rien quand l'app s'est hydratée à temps", () => {
    const app = boot({ alreadyHydrated: true });
    app.fireTimeouts();
    expect(app.overlay()).toBeNull();
    // Le splash reste masqué par #root.is-hydrated (règle CSS), pas par JS.
    expect(app.splash()!.style.display).not.toBe("none");
  });

  it("retire le diagnostic si l'app démarre après le délai (réseau lent)", () => {
    const app = boot();
    app.fireTimeouts();
    expect(app.overlay()).not.toBeNull();

    app.ready();
    app.fireIntervals();

    expect(app.overlay()).toBeNull();
  });
});

describe("index.html — non-régression", () => {
  it("ne masque plus le splash sans condition (cause de l'écran noir)", () => {
    // L'ancien code faisait exactement ceci, sans vérifier l'état de l'app.
    expect(HTML).not.toMatch(
      /setTimeout\(function \(\) \{\s*var el = document\.querySelector\("\.splash-splash-html"\);\s*if \(el\) el\.style\.display = "none";/,
    );
  });

  it("garde la surcouche hors de #root (React viderait ses enfants)", () => {
    // Le script ajoute l'overlay à <body> : vérifié au comportement plus haut,
    // et ici par la présence du point d'ancrage attendu.
    expect(HTML).toContain("document.body.appendChild(el)");
  });
});
