// @vitest-environment jsdom
/**
 * Watchdog de démarrage (Phase 2, robustesse « zéro écran noir »).
 *
 * Régression couverte : le watchdog vivait DANS l'arbre React et posait son
 * drapeau de disponibilité avant d'armer le minuteur → la condition d'échec
 * était toujours fausse, l'écran de récupération n'était jamais atteint (R108).
 * On vérifie désormais qu'un boot qui ne signale pas sa disponibilité produit
 * bien une surcouche de récupération, et qu'un boot sain l'annule.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  armBootWatchdog,
  signalAppReady,
  renderBootRecoveryOverlay,
  BOOT_RECOVERY_ID,
} from "../bootWatchdog";

beforeEach(() => {
  vi.useFakeTimers();
  signalAppReady(); // libère un éventuel minuteur d'un test précédent
  document.body.innerHTML = "";
});

afterEach(() => {
  signalAppReady();
  vi.useRealTimers();
});

describe("armBootWatchdog", () => {
  it("affiche la surcouche de récupération si la coquille ne devient pas prête", () => {
    armBootWatchdog(1000);
    expect(document.getElementById(BOOT_RECOVERY_ID)).toBeNull();
    vi.advanceTimersByTime(1000);
    const el = document.getElementById(BOOT_RECOVERY_ID);
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-screen-state")).toBe("error");
    expect(el?.textContent).toContain("Recharger");
  });

  it("n'affiche rien si la coquille signale sa disponibilité à temps", () => {
    armBootWatchdog(1000);
    signalAppReady();
    vi.advanceTimersByTime(5000);
    expect(document.getElementById(BOOT_RECOVERY_ID)).toBeNull();
  });

  it("signalAppReady après le délai ne retire pas une surcouche déjà affichée", () => {
    armBootWatchdog(1000);
    vi.advanceTimersByTime(1000);
    expect(document.getElementById(BOOT_RECOVERY_ID)).not.toBeNull();
    signalAppReady();
    expect(document.getElementById(BOOT_RECOVERY_ID)).not.toBeNull();
  });
});

describe("renderBootRecoveryOverlay", () => {
  it("le bouton déclenche un rechargement de la page", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...window.location, reload },
    });
    renderBootRecoveryOverlay();
    const btn = document.querySelector(
      `#${BOOT_RECOVERY_ID} button`,
    ) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
