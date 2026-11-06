// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { wcagContrast } from "culori";
import { VIOLET_BRIDGE } from "@/design-system/tokens/bridge.generated";
import { applyTheme, applyThemeMode, getThemeById } from "@/ionic/themes";
import { LUMINA_TOKENS, LUMINA_LIGHT_TOKENS } from "@/ionic/theme";

const root = document.documentElement;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
afterEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-mode");
  root.removeAttribute("style");
});

describe("violet — pont Ionic et retour aux accents historiques", () => {
  it("applique les couleurs et triplets générés dans les deux modes puis restaure l’accent historique", () => {
    applyThemeMode("dark");
    applyTheme(getThemeById("violet"));
    expect(root.dataset.theme).toBe("violet");
    expect(localStorage.getItem("lumina-theme")).toBe("violet");
    expect(root.style.getPropertyValue("--accent-primary")).toBe("var(--lu-accent)");
    for (const mode of ["dark", "light"] as const) {
      applyThemeMode(mode);
      const t = VIOLET_BRIDGE[mode];
      expect(root.style.getPropertyValue("--ion-background-color")).toBe(t.bg);
      expect(root.style.getPropertyValue("--ion-text-color")).toBe(t.fg);
      expect(root.style.getPropertyValue("--ion-color-light")).toBe(t.surface);
      expect(root.style.getPropertyValue("--ion-background-color-rgb")).toBe(rgb(t.bg));
      expect(root.style.getPropertyValue("--ion-color-primary-rgb")).toBe(rgb(t.accent));
      expect(root.style.getPropertyValue("--ion-color-primary-contrast-rgb")).toBe(rgb(t["on-accent"]));
      expect(wcagContrast(t.accent, t["on-accent"])).toBeGreaterThanOrEqual(4.5);
    }
    applyTheme(getThemeById("trust"));
    expect(root.dataset.theme).toBe("trust");
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#2563EB");
    expect(root.style.getPropertyValue("--ion-color-primary-contrast-rgb")).toBe("");
    expect(root.style.getPropertyValue("--ion-background-color")).toBe(LUMINA_LIGHT_TOKENS.canvas);
    applyThemeMode("dark");
    expect(root.style.getPropertyValue("--ion-background-color")).toBe(LUMINA_TOKENS.canvas);
  });
});
