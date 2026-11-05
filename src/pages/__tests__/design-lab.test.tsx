// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DesignLab from "@/pages/DesignLab";
import { ThemeProvider } from "@/design-system/theme/ThemeProvider";
import { useThemeModeStore } from "@/store/useThemeModeStore";
import { useEffectsStore } from "@/design-system/theme/effects";
import { LUMINA_THEMES } from "@/ionic/themes";
import { resolveRoute } from "@/lib/routeResolver";

function renderLab() {
  return render(
    <ThemeProvider>
      <DesignLab />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "fire";
  document.documentElement.dataset.mode = "dark";
  document.documentElement.dataset.effects = "full";
  useEffectsStore.setState({ effects: "full" });
  useThemeModeStore.setState({ mode: "dark" });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-mode");
  document.documentElement.removeAttribute("data-effects");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Design Lab (route dev /dev/design-lab)", () => {
  it("est une route publique en dev, résoluble sans authentification", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(resolveRoute("/dev/design-lab", { isAuthenticated: false })).toEqual({
      outcome: "render",
    });
  });

  it("affiche la barre de recette et tous les groupes de jetons --lu-*", () => {
    renderLab();
    expect(screen.getByTestId("design-lab")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Design Lab");
    // Un swatch par jeton documenté, identifiant lisible pour la recette.
    expect(screen.getByText("--lu-accent")).toBeTruthy();
    expect(screen.getByText("--lu-hero-bg")).toBeTruthy();
    expect(screen.getByText("--lu-chart-6")).toBeTruthy();
    // Aperçu hero + cartes (maquette des écrans P3/P4).
    expect(screen.getByText("Hero & cartes (aperçu P3/P4)")).toBeTruthy();
  });

  it("propose les 10 accents historiques (boutons, aucun <select> natif)", () => {
    renderLab();
    const buttons = LUMINA_THEMES.map((t) => screen.getByTestId(`lab-theme-${t.id}`));
    expect(buttons).toHaveLength(10);
    expect(document.querySelector("select")).toBeNull();
  });

  it("la bascule de mode met à jour data-mode sur <html>", () => {
    renderLab();
    act(() => {
      fireEvent.click(screen.getByTestId("lab-mode-light"));
    });
    expect(document.documentElement.dataset.mode).toBe("light");
  });

  it("le sélecteur de thème applique data-theme sur <html>", () => {
    renderLab();
    act(() => {
      fireEvent.click(screen.getByTestId("lab-theme-trust"));
    });
    expect(document.documentElement.dataset.theme).toBe("trust");
  });

  it("la bascule d'effets met à jour data-effects sur <html>", () => {
    renderLab();
    act(() => {
      fireEvent.click(screen.getByTestId("lab-effects-lite"));
    });
    expect(document.documentElement.dataset.effects).toBe("lite");
  });
});
