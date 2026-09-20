// @vitest-environment jsdom
/**
 * Tests for the dark/light theme mode:
 *  - getStoredThemeMode / persistThemeMode (localStorage, dark default)
 *  - applyThemeMode (data-theme on <html>, Ionic attrs, idempotency)
 *  - useThemeModeStore (setMode persists + flips the document, toggleMode)
 *  - mapping mode → canvas tokens (dark #121212 / light #F5F6F8)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyThemeMode,
  applyStoredThemeMode,
  getStoredThemeMode,
  persistThemeMode,
  THEME_MODE_STORAGE_KEY,
} from "@/ionic/themes";
import { useThemeModeStore } from "@/store/useThemeModeStore";

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
  root.removeAttribute("ion-theme");
  root.removeAttribute("color-theme");
});

describe("getStoredThemeMode / persistThemeMode", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(getStoredThemeMode()).toBe("dark");
  });

  it("reads back a persisted light mode", () => {
    persistThemeMode("light");
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(getStoredThemeMode()).toBe("light");
  });

  it("falls back to dark on a corrupt value", () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, "neon");
    expect(getStoredThemeMode()).toBe("dark");
  });
});

describe("applyThemeMode", () => {
  it("sets data-theme on <html> and the Ionic theme attributes", () => {
    applyThemeMode("light");
    expect(root.dataset.theme).toBe("light");
    expect(root.getAttribute("ion-theme")).toBe("light");
    expect(root.getAttribute("color-theme")).toBe("light");
  });

  it("defaults to dark when no mode is given", () => {
    applyThemeMode();
    expect(root.dataset.theme).toBe("dark");
    expect(root.getAttribute("ion-theme")).toBe("dark");
  });

  it("persists the chosen mode", () => {
    applyThemeMode("light");
    expect(getStoredThemeMode()).toBe("light");
    applyThemeMode("dark");
    expect(getStoredThemeMode()).toBe("dark");
  });

  it("sets mode-specific Ionic vars (--ion-background-color)", () => {
    applyThemeMode("light");
    expect(root.style.getPropertyValue("--ion-background-color")).toBe(
      "#F5F6F8",
    );
    expect(root.style.getPropertyValue("--ion-text-color")).toBe("#1A1A1A");
    applyThemeMode("dark");
    expect(root.style.getPropertyValue("--ion-background-color")).toBe(
      "#121212",
    );
    expect(root.style.getPropertyValue("--ion-text-color")).toBe("#FFFFFF");
  });

  it("is idempotent", () => {
    applyThemeMode("light");
    applyThemeMode("light");
    expect(root.dataset.theme).toBe("light");
  });
});

describe("applyStoredThemeMode", () => {
  it("restores a stored light mode", () => {
    persistThemeMode("light");
    applyStoredThemeMode();
    expect(root.dataset.theme).toBe("light");
  });

  it("restores dark when nothing is stored", () => {
    applyStoredThemeMode();
    expect(root.dataset.theme).toBe("dark");
  });
});

describe("useThemeModeStore", () => {
  it("setMode applies the mode to the document and updates the state", () => {
    useThemeModeStore.getState().setMode("light");
    expect(useThemeModeStore.getState().mode).toBe("light");
    expect(root.dataset.theme).toBe("light");
    expect(getStoredThemeMode()).toBe("light");
  });

  it("toggleMode flips light → dark and back", () => {
    useThemeModeStore.getState().setMode("dark");
    useThemeModeStore.getState().toggleMode();
    expect(useThemeModeStore.getState().mode).toBe("light");
    expect(root.dataset.theme).toBe("light");
    useThemeModeStore.getState().toggleMode();
    expect(useThemeModeStore.getState().mode).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });
});
