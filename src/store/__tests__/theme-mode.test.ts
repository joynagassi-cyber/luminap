// @vitest-environment jsdom
/**
 * Tests for the display mode (system/dark/light):
 *  - getStoredThemeMode / persistThemeMode (localStorage, "system" default)
 *  - resolveThemeMode (system → OS preference, dark fallback sans matchMedia)
 *  - applyThemeMode (data-mode = mode résolu, Ionic attrs, idempotency)
 *  - useThemeModeStore (setMode persists + flips the document, toggleMode)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyThemeMode,
  applyStoredThemeMode,
  getStoredThemeMode,
  persistThemeMode,
  resolveThemeMode,
  THEME_MODE_STORAGE_KEY,
} from "@/ionic/themes";
import { useThemeModeStore } from "@/store/useThemeModeStore";

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-mode");
  root.removeAttribute("ion-theme");
  root.removeAttribute("color-theme");
});

describe("getStoredThemeMode / persistThemeMode", () => {
  it("defaults to system when nothing is stored", () => {
    expect(getStoredThemeMode()).toBe("system");
  });

  it("reads back a persisted light mode", () => {
    persistThemeMode("light");
    expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe("light");
    expect(getStoredThemeMode()).toBe("light");
  });

  it("falls back to system on a corrupt value", () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, "neon");
    expect(getStoredThemeMode()).toBe("system");
  });
});

describe("resolveThemeMode", () => {
  it("passes through explicit dark / light", () => {
    expect(resolveThemeMode("dark")).toBe("dark");
    expect(resolveThemeMode("light")).toBe("light");
  });

  it("resolves system to dark when matchMedia is unavailable (jsdom default)", () => {
    expect(resolveThemeMode("system")).toBe("dark");
  });
});

describe("applyThemeMode", () => {
  it("sets data-mode on <html> and the Ionic theme attributes", () => {
    applyThemeMode("light");
    expect(root.dataset.mode).toBe("light");
    expect(root.getAttribute("ion-theme")).toBe("light");
    expect(root.getAttribute("color-theme")).toBe("light");
  });

  it("defaults to dark when no mode is given", () => {
    applyThemeMode();
    expect(root.dataset.mode).toBe("dark");
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
      "#F7F7F8",
    );
    expect(root.style.getPropertyValue("--ion-text-color")).toBe("#18181B");
    applyThemeMode("dark");
    expect(root.style.getPropertyValue("--ion-background-color")).toBe(
      "#0F0F10",
    );
    expect(root.style.getPropertyValue("--ion-text-color")).toBe("#F4F4F5");
  });

  it("is idempotent", () => {
    applyThemeMode("light");
    applyThemeMode("light");
    expect(root.dataset.mode).toBe("light");
  });
});

describe("applyStoredThemeMode", () => {
  it("restores a stored light mode", () => {
    persistThemeMode("light");
    applyStoredThemeMode();
    expect(root.dataset.mode).toBe("light");
  });

  it("restores dark when nothing is stored", () => {
    applyStoredThemeMode();
    expect(root.dataset.mode).toBe("dark");
  });
});

describe("useThemeModeStore", () => {
  it("setMode applies the mode to the document and updates the state", () => {
    useThemeModeStore.getState().setMode("light");
    expect(useThemeModeStore.getState().mode).toBe("light");
    expect(root.dataset.mode).toBe("light");
    expect(getStoredThemeMode()).toBe("light");
  });

  it("toggleMode flips light → dark and back", () => {
    useThemeModeStore.getState().setMode("dark");
    useThemeModeStore.getState().toggleMode();
    expect(useThemeModeStore.getState().mode).toBe("light");
    expect(root.dataset.mode).toBe("light");
    useThemeModeStore.getState().toggleMode();
    expect(useThemeModeStore.getState().mode).toBe("dark");
    expect(root.dataset.mode).toBe("dark");
  });
});
