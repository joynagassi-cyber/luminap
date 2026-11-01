// @vitest-environment jsdom
/**
 * Réglage d'affichage des montants — intégration UI.
 *
 * Vérifie que le sélecteur (Réglages → Thème & apparence) change RÉELLEMENT la
 * préférence globale, la persiste, et se reflète dans l'état accessible
 * (`aria-checked`). Non-vacuity : retirer l'appel `setFormat` de l'`onClick`
 * laisse le format inchangé → test rouge.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  useMoneyFormatStore,
  setMoneyFormat,
  getMoneyFormat,
  MONEY_FORMAT_STORAGE_KEY,
  DEFAULT_MONEY_FORMAT,
} from "@/lib/moneyFormat";

vi.mock("lucide-react", () => ({
  Check: ({ className }: { className?: string }) => <svg className={className} data-icon="check" />,
}));

import MoneyFormatPicker from "@/components/MoneyFormatPicker";
import SettingsTheme from "@/pages/SettingsTheme";

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ThemeToggle", () => ({ default: () => <div /> }));
vi.mock("@/components/ThemePicker", () => ({ default: () => <div /> }));
vi.mock("@/components/BadgeGallery", () => ({ default: () => <div /> }));

beforeEach(() => {
  localStorage.clear();
  setMoneyFormat(DEFAULT_MONEY_FORMAT);
  useMoneyFormatStore.setState({ format: DEFAULT_MONEY_FORMAT });
});

describe("MoneyFormatPicker", () => {
  it("affiche les 4 options et marque la courante", () => {
    render(<MoneyFormatPicker />);
    expect(screen.getByTestId("money-format-fullFcfa")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("money-format-compact")).toHaveAttribute("aria-checked", "false");
  });

  it("cliquer « compact » change la préférence globale et la persiste", () => {
    render(<MoneyFormatPicker />);
    fireEvent.click(screen.getByTestId("money-format-compact"));

    expect(useMoneyFormatStore.getState().format).toBe("compact");
    expect(getMoneyFormat()).toBe("compact");
    expect(localStorage.getItem(MONEY_FORMAT_STORAGE_KEY)).toBe("compact");
    expect(screen.getByTestId("money-format-compact")).toHaveAttribute("aria-checked", "true");
  });
});

describe("SettingsTheme — expose le réglage de format", () => {
  it("rend le sélecteur et son clic met à jour le format", () => {
    render(<SettingsTheme />);
    expect(screen.getByRole("radiogroup", { name: /Format d'affichage des montants/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("money-format-compactFcfa"));
    expect(getMoneyFormat()).toBe("compactFcfa");
  });
});
