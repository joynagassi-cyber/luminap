// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyStoredTheme,
  applyTheme,
  applyThemeMode,
  DEFAULT_THEME_ID,
  getThemeById,
  LUMINA_THEMES,
} from "@/ionic/themes";

const html = readFileSync("index.html", "utf8");
const script = html.match(/<script>\s*([\s\S]*?lumina-theme-mode[\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("Script de thème anti-flash introuvable");

function boot(values: Record<string, string>, matches?: boolean, failKey?: string, device: Record<string, number> = {}) {
  const dataset: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      if (key === failKey) throw new Error("storage inaccessible");
      return values[key] ?? null;
    },
  };
  const window = matches === undefined ? {} : { matchMedia: () => ({ matches }) };
  runInNewContext(script!, { document: { documentElement: { dataset } }, localStorage, window, navigator: device });
  return dataset;
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-mode");
  vi.restoreAllMocks();
});

describe("anti-flash : préférences existantes", () => {
  it.each(LUMINA_THEMES)("reconnaît l'accent persisté $id comme au runtime", ({ id }) => {
    expect(boot({ "lumina-theme": id, "lumina-theme-mode": "light" }, true)).toEqual({ theme: id, mode: "light", effects: "full" });
    localStorage.setItem("lumina-theme", id);
    applyStoredTheme();
    expect(document.documentElement.dataset.theme).toBe(id);
  });

  it.each([
    ["system", true, "dark"], ["system", false, "light"],
    ["dark", false, "dark"], ["light", true, "light"],
    ["invalid", true, "dark"],
  ])("résout %s avec préférence sombre=%s", (choice, matches, expected) => {
    expect(boot({ "lumina-theme-mode": choice }, matches)).toEqual({ theme: DEFAULT_THEME_ID, mode: expected, effects: "full" });
  });

  it("replie les valeurs invalides et l'absence de matchMedia comme le runtime", () => {
    expect(boot({ "lumina-theme": "invalid", "lumina-theme-mode": "invalid" })).toEqual({ theme: DEFAULT_THEME_ID, mode: "dark", effects: "full" });
    localStorage.setItem("lumina-theme", "invalid");
    applyStoredTheme();
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME_ID);
  });

  it("isole les erreurs de lecture des deux préférences", () => {
    expect(boot({ "lumina-theme-mode": "light" }, true, "lumina-theme")).toEqual({ theme: DEFAULT_THEME_ID, mode: "light", effects: "full" });
    expect(boot({ "lumina-theme": "trust" }, false, "lumina-theme-mode")).toEqual({ theme: "trust", mode: "light", effects: "full" });
  });

  it("détecte les effets avant rendu et respecte le choix persisté", () => {
    expect(boot({}, true, undefined, { deviceMemory: 2, hardwareConcurrency: 8 }).effects).toBe("lite");
    expect(boot({}, true, undefined, { deviceMemory: 8, hardwareConcurrency: 4 }).effects).toBe("lite");
    expect(boot({}, true, undefined, { deviceMemory: 8, hardwareConcurrency: 8 }).effects).toBe("full");
    expect(boot({ "lumina-theme-effects": "full" }, true, undefined, { deviceMemory: 1 }).effects).toBe("full");
    expect(boot({ "lumina-theme-effects": "lite" }, true, undefined, { hardwareConcurrency: 8 }).effects).toBe("lite");
    expect(boot({ "lumina-theme-effects": "invalid" }, true, "lumina-theme-effects", { hardwareConcurrency: 2 }).effects).toBe("lite");
  });

  it("conserve l'accent et le mode indépendants lors des bascules", () => {
    applyTheme(getThemeById("trust"));
    applyThemeMode("light");
    expect(document.documentElement.dataset.theme).toBe("trust");
    expect(document.documentElement.dataset.mode).toBe("light");
    applyTheme(getThemeById("spirit"));
    expect(document.documentElement.dataset.mode).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("spirit");
    expect(localStorage.getItem("lumina-theme")).toBe("spirit");
    expect(localStorage.getItem("lumina-theme-mode")).toBe("light");
  });
  it("suit le système sans écraser l'accent et cesse de le suivre en mode explicite", () => {
    let matches = false;
    let onChange: (() => void) | undefined;
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() { return matches; },
      addEventListener: (_event: string, callback: () => void) => { onChange = callback; },
    })));
    applyTheme(getThemeById("trust"));
    applyThemeMode("system");
    expect(document.documentElement.dataset.mode).toBe("light");
    matches = true;
    onChange?.();
    expect(document.documentElement.dataset.mode).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("trust");
    expect(localStorage.getItem("lumina-theme-mode")).toBe("system");
    applyThemeMode("light");
    onChange?.();
    expect(document.documentElement.dataset.mode).toBe("light");
    vi.unstubAllGlobals();
  });

});
