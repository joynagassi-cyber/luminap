// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/design-system/theme/ThemeProvider";
import { useTheme } from "@/design-system/theme/theme-context";
import { EffectsToggle } from "@/components/EffectsToggle";
import { applyEffects, detectEffects, EFFECTS_STORAGE_KEY, getInitialEffects, useEffectsStore } from "@/design-system/theme/effects";
import { withThemeTransition } from "@/design-system/theme/transition";
import { applyTheme, getThemeById } from "@/ionic/themes";
import { useThemeModeStore } from "@/store/useThemeModeStore";

function Probe() {
  const theme = useTheme();
  return <div>
    <output data-testid="theme">{theme.themeId}/{theme.mode}/{theme.effects}</output>
    <button onClick={() => theme.setTheme("trust")}>Accent</button>
    <button onClick={() => theme.setMode("light")}>Mode</button>
    <EffectsToggle />
  </div>;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "fire";
  document.documentElement.dataset.mode = "dark";
  document.documentElement.dataset.effects = "full";
  useEffectsStore.setState({ effects: "full" });
  useThemeModeStore.setState({ mode: "dark" });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-mode");
  document.documentElement.removeAttribute("data-effects");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("détection et persistance des effets", () => {
  it.each([
    [{ deviceMemory: 2, hardwareConcurrency: 8 }, "lite"],
    [{ deviceMemory: 4, hardwareConcurrency: 4 }, "lite"],
    [{ deviceMemory: 4, hardwareConcurrency: 8 }, "full"],
    [{ deviceMemory: 0, hardwareConcurrency: NaN }, "full"],
    [{}, "full"],
  ] as const)("détecte %o → %s", (device, expected) => {
    expect(detectEffects(device)).toBe(expected);
  });
  it("le choix explicite prime, il est conservé et aucune clé n'est créée par la détection", () => {
    applyEffects("lite", false);
    expect(localStorage.getItem(EFFECTS_STORAGE_KEY)).toBeNull();
    applyEffects("full");
    expect(getInitialEffects()).toBe("full");
    expect(document.documentElement.dataset.effects).toBe("full");
  });
  it("la lecture et l'écriture restent sûres si le stockage échoue", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("read"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("write"); });
    expect(() => getInitialEffects()).not.toThrow();
    expect(() => useEffectsStore.getState().setEffects("lite")).not.toThrow();
    expect(document.documentElement.dataset.effects).toBe("lite");
    expect(useEffectsStore.getState().effects).toBe("lite");
  });
});

describe("ThemeProvider + réglage accessible", () => {
  it("bascule sans démonter les enfants, synchronise les trois préférences et le picker existant", async () => {
    const childMounted = vi.fn();
    function Child() { const [value] = useState(() => { childMounted(); return "état conservé"; }); return <span>{value}</span>; }
    render(<ThemeProvider><Probe /><Child /></ThemeProvider>);
    fireEvent.click(screen.getByText("Accent"));
    await act(async () => {});
    expect(screen.getByTestId("theme").textContent).toBe("trust/dark/full");
    expect(localStorage.getItem("lumina-theme")).toBe("trust");
    fireEvent.click(screen.getByText("Mode"));
    expect(screen.getByTestId("theme").textContent).toBe("trust/light/full");
    expect(localStorage.getItem("lumina-theme-mode")).toBe("light");
    fireEvent.click(screen.getByRole("radio", { name: "Allégés" }));
    expect(screen.getByRole("radio", { name: "Allégés" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("theme").textContent).toBe("trust/light/lite");
    expect(document.documentElement.dataset.effects).toBe("lite");
    expect(localStorage.getItem(EFFECTS_STORAGE_KEY)).toBe("lite");
    await act(async () => { applyTheme(getThemeById("spirit")); });
    expect(screen.getByTestId("theme").textContent).toBe("spirit/light/lite");
    expect(screen.getByText("état conservé")).toBeTruthy();
    expect(childMounted).toHaveBeenCalledTimes(1);
  });
});

describe("transitions de thème", () => {
  it("respecte reduced-motion et applique une seule fois", () => {
    const apply = vi.fn();
    const start = vi.fn();
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    withThemeTransition(apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
  });
  it("utilise View Transition quand disponible, sinon enlève la classe de repli", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    const apply = vi.fn();
    const start = vi.fn((cb: () => void) => cb());
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    withThemeTransition(apply);
    expect(start).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledOnce();
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
    withThemeTransition(apply);
    expect(document.documentElement.classList.contains("theme-transition")).toBe(true);
    vi.advanceTimersByTime(300);
    expect(document.documentElement.classList.contains("theme-transition")).toBe(false);
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
