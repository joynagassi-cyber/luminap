// @vitest-environment jsdom
/**
 * Paramètre d'affichage multi-format des montants (`src/lib/moneyFormat.ts`).
 *
 * Vérifie :
 *  - les 4 rendus demandés (50 000 / 50 000 FCFA / 50K / 50K FCFA) et les
 *    bornes K/M (« 1M » et non « 1,0M ») ;
 *  - que `formatCentsToFCFA` (le formateur utilisé par ~35 écrans) suit la
 *    préférence — donc que changer le réglage change RÉELLEMENT l'affichage ;
 *  - que la préférence est persistée et que `formatCurrencyFull` (colonnes de
 *    tableaux) reste TOUJOURS complet, indépendamment du réglage.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  formatAmount,
  renderMoney,
  formatMoney,
  getStoredMoneyFormat,
  setMoneyFormat,
  useMoneyFormatStore,
  MONEY_FORMAT_STORAGE_KEY,
  DEFAULT_MONEY_FORMAT,
  isMoneyFormat,
} from "@/lib/moneyFormat";
import { formatCentsToFCFA, formatCurrencyFull, formatCurrencyCompact } from "@/lib/utils";

/** `Intl` groupe avec une espace fine insécable (U+202F) : on normalise. */
const norm = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");

beforeEach(() => {
  localStorage.clear();
  setMoneyFormat(DEFAULT_MONEY_FORMAT);
});
afterEach(() => {
  setMoneyFormat(DEFAULT_MONEY_FORMAT);
});

describe("formatAmount — les deux formes de base", () => {
  it("compact : 50 000 FCFA → « 50K » ; 1 000 000 FCFA → « 1M » (pas « 1,0M »)", () => {
    expect(formatAmount(5_000_000, "compact")).toBe("50K"); // 50 000 FCFA
    expect(formatAmount(100_000_000, "compact")).toBe("1M"); // 1 000 000 FCFA
    expect(formatAmount(150_000_000, "compact")).toBe("1,5M");
    expect(norm(formatAmount(50_000, "compact"))).toBe("500"); // < 1000 FCFA
  });

  it("full : groupé par milliers, sans K/M", () => {
    expect(norm(formatAmount(5_000_000, "full"))).toBe("50 000");
    expect(norm(formatAmount(100_000_000, "full"))).toBe("1 000 000");
    expect(norm(formatAmount(5_000_000_000, "full"))).toBe("50 000 000");
  });
});

describe("renderMoney — les 4 options produit", () => {
  const cents = 5_000_000; // 50 000 FCFA
  it("50 000 FCFA (complet + devise)", () => {
    expect(norm(renderMoney(cents, "fullFcfa"))).toBe("50 000 FCFA");
  });
  it("50 000 (complet sans devise)", () => {
    expect(norm(renderMoney(cents, "full"))).toBe("50 000");
  });
  it("50K FCFA (compact + devise)", () => {
    expect(renderMoney(cents, "compactFcfa")).toBe("50K FCFA");
  });
  it("50K (compact sans devise)", () => {
    expect(renderMoney(cents, "compact")).toBe("50K");
  });
});

describe("préférence persistée + propagation", () => {
  it("défaut = complet avec devise ; illisible → défaut (fail-safe)", () => {
    expect(getStoredMoneyFormat()).toBe("fullFcfa");
    localStorage.setItem(MONEY_FORMAT_STORAGE_KEY, "nonsense");
    expect(getStoredMoneyFormat()).toBe("fullFcfa");
  });

  it("setMoneyFormat persiste ET change l'affichage de formatCentsToFCFA", () => {
    setMoneyFormat("compact");
    expect(localStorage.getItem(MONEY_FORMAT_STORAGE_KEY)).toBe("compact");
    expect(formatCentsToFCFA(5_000_000)).toBe("50K");
    setMoneyFormat("fullFcfa");
    expect(norm(formatCentsToFCFA(5_000_000))).toBe("50 000 FCFA");
  });

  it("formatCurrencyCompact suit la préférence ; formatCurrencyFull reste complet", () => {
    setMoneyFormat("compact");
    expect(formatCurrencyCompact(5_000_000)).toBe("50K");
    expect(norm(formatCurrencyFull(5_000_000))).toBe("50 000");
    setMoneyFormat("fullFcfa");
    expect(norm(formatCurrencyCompact(5_000_000))).toBe("50 000 FCFA");
    expect(norm(formatCurrencyFull(5_000_000))).toBe("50 000");
  });

  it("le store Zustand expose le format courant et notifie ses abonnés", () => {
    const seen: string[] = [];
    const unsub = useMoneyFormatStore.subscribe((s) => seen.push(s.format));
    useMoneyFormatStore.getState().setFormat("compact");
    expect(useMoneyFormatStore.getState().format).toBe("compact");
    expect(seen).toContain("compact");
    expect(formatMoney(5_000_000)).toBe("50K");
    unsub();
  });

  it("isMoneyFormat rejette toute valeur hors des 4 options", () => {
    expect(isMoneyFormat("compact")).toBe(true);
    expect(isMoneyFormat("fullFcfa")).toBe(true);
    expect(isMoneyFormat("K")).toBe(false);
    expect(isMoneyFormat(undefined)).toBe(false);
  });
});
