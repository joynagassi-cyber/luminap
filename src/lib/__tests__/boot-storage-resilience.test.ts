// @vitest-environment jsdom
/**
 * Phase 11 — chaos : résilience du boot à un stockage indisponible.
 *
 * Régression couverte : `applyStoredTheme()` / `applyStoredThemeMode()` sont
 * appelés dans `main.tsx` AVANT le montage React. Ils appelaient
 * `localStorage.setItem` sans garde ; un stockage indisponible (mode privé,
 * quota plein) levait une exception à cet endroit → **React ne montait jamais**
 * → écran noir silencieux, hors de portée du watchdog.
 *
 * On vérifie ici que la persistance du thème est « best-effort » : une écriture
 * qui échoue n'interrompt pas l'application, et le thème est quand même posé
 * sur le document.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  applyStoredTheme,
  applyStoredThemeMode,
  getStoredThemeId,
  getStoredThemeMode,
  persistThemeId,
  persistThemeMode,
} from "@/ionic/themes";
import { useLocalStore } from "@/store/useLocalStore";

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute("data-theme");
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Rend `localStorage.setItem` défaillant, comme un quota plein / mode privé. */
function breakSetItem(): void {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("QuotaExceededError", "QuotaExceededError");
  });
}

/** Rend `localStorage.getItem` défaillant, comme un stockage inaccessible. */
function breakGetItem(): void {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("SecurityError", "SecurityError");
  });
}

describe("lecture du thème — best-effort (chaos stockage)", () => {
  it("getStoredThemeId renvoie null quand getItem échoue", () => {
    breakGetItem();
    expect(() => getStoredThemeId()).not.toThrow();
    expect(getStoredThemeId()).toBeNull();
  });

  it("getStoredThemeMode retombe sur dark quand getItem échoue", () => {
    breakGetItem();
    expect(getStoredThemeMode()).toBe("dark");
  });

  it("applyStoredTheme garde le boot et applique le thème par défaut", () => {
    breakGetItem();
    expect(() => applyStoredTheme()).not.toThrow();
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#FF6B00");
  });

  it("applyStoredThemeMode garde le boot et applique dark", () => {
    breakGetItem();
    expect(() => applyStoredThemeMode()).not.toThrow();
    expect(root.dataset.theme).toBe("dark");
  });
});

describe("persistance du thème — best-effort (chaos stockage)", () => {
  it("persistThemeId ne lève pas quand setItem échoue", () => {
    breakSetItem();
    expect(() => persistThemeId("spirit")).not.toThrow();
  });

  it("persistThemeMode ne lève pas quand setItem échoue", () => {
    breakSetItem();
    expect(() => persistThemeMode("light")).not.toThrow();
  });

  it("applyStoredTheme n'interrompt pas le boot et pose l'accent", () => {
    breakSetItem();
    expect(() => applyStoredTheme()).not.toThrow();
    // Le thème par défaut (fire) est appliqué aux variables CSS du document.
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#FF6B00");
  });

  it("applyStoredThemeMode n'interrompt pas le boot et pose le mode", () => {
    breakSetItem();
    expect(() => applyStoredThemeMode()).not.toThrow();
    expect(root.dataset.theme).toBe("dark");
  });
});

describe("selectRole — best-effort (chaos stockage)", () => {
  it("ne lève pas et pose le rôle en mémoire quand setItem échoue", async () => {
    breakSetItem();
    await expect(
      useLocalStore.getState().selectRole("TREASURIER" as never),
    ).resolves.toBeUndefined();
    expect(useLocalStore.getState().user.role).toBe("TREASURIER");
  });
});
