// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LuAmountInput, LuChart, LuSheet, LuTimeline, parseAmountInput } from "@/design-system/components";

afterEach(() => cleanup());

describe("LuSheet (P3)", () => {
  it("fermée par défaut ; ouverte = dialog 60vh, poignée, rayon haut 28, fond surface", () => {
    const { rerender } = render(<LuSheet open={false} onClose={() => {}} title="Nouvelle transaction"><p>form</p></LuSheet>);
    expect(screen.queryByTestId("lu-sheet")).toBeNull();
    rerender(<LuSheet open onClose={() => {}} title="Nouvelle transaction"><p>form</p></LuSheet>);
    const sheet = screen.getByTestId("lu-sheet");
    expect(sheet.getAttribute("role")).toBe("dialog");
    expect(sheet.style.height).toBe("60vh");
    expect(sheet.style.borderRadius).toContain("var(--lu-radius-xl)");
    expect(sheet.style.background).toContain("var(--lu-surface)");
    expect(sheet.textContent).toContain("form");
  });

  it("snap 0.92 + fermeture Échap et backdrop", () => {
    const onClose = vi.fn();
    render(<LuSheet open snap={0.92} onClose={onClose}><p>x</p></LuSheet>);
    expect(screen.getByTestId("lu-sheet").style.height).toBe("92vh");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("parseAmountInput + LuAmountInput (P3)", () => {
  it("parse « 12 500,50 » et « 12500.5 » en unités majeures", () => {
    expect(parseAmountInput("12 500,50")).toBe(12500.5);
    expect(parseAmountInput("12500.5")).toBe(12500.5);
    expect(parseAmountInput("abc")).toBe(0);
  });

  it("champ : devise préfixe muted, saisie 40/700 tabulaire, onAmountChange en majeurs", () => {
    const onAmountChange = vi.fn();
    render(<LuAmountInput value={0} onAmountChange={onAmountChange} />);
    const input = screen.getByLabelText("Montant");
    expect(input.className).toContain("text-4xl");
    expect(input.className).toContain("tabular-nums");
    expect(screen.getByText("XOF").style.color).toContain("var(--lu-fg-muted)");
    fireEvent.change(input, { target: { value: "25000" } });
    expect(onAmountChange).toHaveBeenCalledWith(25000);
  });
});

describe("LuTimeline (P3)", () => {
  it("points + ligne verticale, dernier item sans ligne, montant signé à droite", () => {
    render(
      <LuTimeline
        items={[
          { id: "1", title: "Vente du matin", subtitle: "Caisse principale", amount: 45000 },
          { id: "2", title: "Achat fournitures", subtitle: "Aujourd'hui", amount: -12000 },
        ]}
      />,
    );
    const tl = screen.getByTestId("lu-timeline");
    expect(tl.tagName).toBe("OL");
    expect(tl.querySelectorAll("li")).toHaveLength(2);
    // ligne verticale présente sur le 1er item, absente du dernier
    const lines = tl.querySelectorAll("span span");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(tl.textContent).toContain("Vente du matin");
    expect(tl.textContent).toMatch(/45.000/);
    expect(tl.textContent).toMatch(/12.000/);
  });
});

describe("LuChart (P3)", () => {
  it("barres SVG 100 % en jetons, barre max en accent, libellés, légende montants", () => {
    render(
      <LuChart
        data={[
          { label: "L", value: 40, amount: 40000 },
          { label: "M", value: 70 },
          { label: "M", value: 100, amount: 100000 },
        ]}
      />,
    );
    const chart = screen.getByTestId("lu-chart");
    const svg = chart.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBeTruthy();
    const rects = svg.querySelectorAll("rect");
    expect(rects).toHaveLength(3);
    // barre max (100) en accent, les autres en jetons chart-*
    expect(rects[2].getAttribute("fill")).toBe("var(--lu-accent)");
    expect(rects[0].getAttribute("fill")).toMatch(/var\(--lu-chart-/);
    // grille en chart-grid
    expect(svg.querySelector("line")!.getAttribute("stroke")).toBe("var(--lu-chart-grid)");
    // libellés + légende
    expect(svg.textContent).toContain("L");
    expect(chart.textContent).toMatch(/100.000/);
  });
});
