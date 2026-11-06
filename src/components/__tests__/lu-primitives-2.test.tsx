// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarDays, Flame, Home, Plus } from "lucide-react";
import { LuAmount, LuCard, LuField, LuSegmented } from "@/design-system/components";
import { ThemeContext, type ThemeContextValue } from "@/design-system/theme/theme-context";

afterEach(() => cleanup());

function withTheme(ui: React.ReactElement, effects: "full" | "lite" = "full", mode: "dark" | "light" = "dark") {
  const value: ThemeContextValue = {
    themeId: "fire",
    mode,
    effects,
    setTheme: vi.fn(),
    setMode: vi.fn(),
    setEffects: vi.fn(),
  };
  return <ThemeContext.Provider value={value}>{ui}</ThemeContext.Provider>;
}

describe("LuCard (P2)", () => {
  it("surface : fond surface, rayon xl, bordure --lu-border", () => {
    render(<LuCard>contenu</LuCard>);
    const card = screen.getByText("contenu");
    expect(card.style.background).toContain("var(--lu-surface)");
    expect(card.style.borderRadius).toContain("var(--lu-radius-xl)");
    expect(card.style.border).toContain("var(--lu-border)");
  });

  it("inverse : surface-inverse + texte fg-inverse (point focal)", () => {
    render(<LuCard variant="inverse">Solde</LuCard>);
    const card = screen.getByText("Solde");
    expect(card.style.background).toContain("var(--lu-surface-inverse)");
    expect(card.style.color).toContain("var(--lu-fg-inverse)");
  });

  it("accent : aplat accent + on-accent", () => {
    render(<LuCard variant="accent">Hero</LuCard>);
    const card = screen.getByText("Hero");
    expect(card.style.background).toContain("var(--lu-accent)");
    expect(card.style.color).toContain("var(--lu-on-accent)");
  });

  it("glass : verre en effects=full, repli surface-2 en lite", () => {
    render(withTheme(<LuCard variant="glass">V</LuCard>, "full"));
    expect(screen.getByText("V").style.background).toContain("var(--lu-glass-bg)");
    cleanup();
    render(withTheme(<LuCard variant="glass">V</LuCard>, "lite"));
    expect(screen.getByText("V").style.background).toContain("var(--lu-surface-2)");
  });

  it("stat : titre muted + valeur + légende ; tile : cercle icône 40 + label + clic clavier", () => {
    render(
      <LuCard variant="stat" title="Solde" legend="Depuis le début" value={<LuAmount amount={142830} size="amount-lg" />} icon={<Flame size={18} />} />,
    );
    expect(screen.getByText("Solde").style.color).toContain("var(--lu-fg-muted)");
    expect(screen.getByText("142 830")).toBeTruthy();
    expect(screen.getByText("Depuis le début")).toBeTruthy();
    cleanup();
    const onClick = vi.fn();
    render(<LuCard variant="tile" icon={<Plus size={20} />} label="Ajouter" onClick={onClick} />);
    const tile = screen.getByRole("button", { name: /ajouter/i });
    expect(tile.style.borderRadius).toContain("var(--lu-radius-lg)");
    fireEvent.keyDown(tile, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("LuAmount (P2)", () => {
  it("XOF sans décimales, séparateur de milliers, tabular-nums", () => {
    render(<LuAmount amount={142830} />);
    const el = screen.getByText(/142/).parentElement!;
    expect(el.textContent).toContain("142");
    expect(el.textContent).toContain("830");
    expect(el.textContent).toContain("XOF");
    expect(el.textContent).not.toContain(",");
    expect(el.style.fontVariantNumeric).toBe("tabular-nums");
  });

  it("signe moins vrai U+2212 (pas un tiret) ; signed ajoute le +", () => {
    render(<LuAmount amount={-3200} />);
    expect(screen.getByText("−", { exact: false })).toBeTruthy();
    expect(document.body.textContent).not.toContain("-3");
    cleanup();
    render(<LuAmount amount={3200} signed />);
    expect(document.body.textContent).toContain("+");
  });

  it("devise à décimales : fraction en --lu-fg-subtle", () => {
    render(<LuAmount amount={-1234.5} currency="EUR" />);
    const fraction = screen.getByText(",50");
    expect(fraction.style.color).toContain("var(--lu-fg-subtle)");
  });

  it("taille display = 44px avec tracking serré", () => {
    render(<LuAmount amount={142830} size="display" />);
    const el = screen.getByText(/142/).parentElement!;
    expect(el.style.fontSize).toBe("44px");
    expect(el.style.letterSpacing).toBe("-0.02em");
  });
});

describe("LuField (P2)", () => {
  it("label au-dessus de la valeur DANS le champ (pas de superposition)", () => {
    render(<LuField label="Titre" value="Achat" onChange={() => {}} />);
    const box = screen.getByTestId("lu-field-box");
    expect(box.style.background).toContain("var(--lu-surface-2)");
    expect(box.style.minHeight).toBe("56px");
    const label = screen.getByText("Titre");
    expect(box.contains(label)).toBe(false); // le label est au-dessus du conteneur interne
    expect(label.style.color).toContain("var(--lu-fg-muted)");
    expect(screen.getByLabelText(/Titre/)).toBeTruthy();
  });

  it("onChange remonte la valeur ; trailing rendu", () => {
    const onChange = vi.fn();
    render(<LuField label="Date" value="" onChange={onChange} trailing={<CalendarDays size={18} />} />);
    fireEvent.change(screen.getByLabelText(/Date/), { target: { value: "2026-11-06" } });
    expect(onChange).toHaveBeenCalledWith("2026-11-06");
  });

  it("erreur : bordure --lu-expense + message avec icône SOUS le champ (role=alert)", () => {
    render(<LuField label="Montant" value="" onChange={() => {}} error="Montant requis" />);
    const box = screen.getByTestId("lu-field-box");
    expect(box.style.border).toContain("var(--lu-expense)");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Montant requis");
    expect(alert.style.color).toContain("var(--lu-expense)");
    expect(alert.querySelector("svg")).toBeTruthy();
  });

  it("focus : bordure accent + anneau focus-ring ; disabled : opacité .4", () => {
    render(<LuField label="Titre" value="x" onChange={() => {}} />);
    const input = screen.getByLabelText(/Titre/);
    fireEvent.focus(input);
    expect(screen.getByTestId("lu-field-box").style.border).toContain("var(--lu-accent)");
    expect(screen.getByTestId("lu-field-box").style.outline).toContain("var(--lu-focus-ring)");
    fireEvent.blur(input);
    cleanup();
    render(<LuField label="Titre" value="x" disabled />);
    expect(screen.getByTestId("lu-field-box").style.opacity).toBe("0.4");
  });
});

describe("LuSegmented (P2)", () => {
  const options = [
    { value: "out", label: "Sortie" },
    { value: "in", label: "Entrée" },
    { value: "all", label: "Toutes" },
  ];

  it("rend les options en tabs, sélection = classe sur l'hôte + aria-selected (leçon #417)", () => {
    render(<LuSegmented options={options} value="in" onChange={() => {}} />);
    const selected = screen.getByRole("tab", { name: "Entrée" });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(selected.className).toContain("lu-segmented-option--selected");
    expect(screen.getByRole("tab", { name: "Sortie" }).getAttribute("aria-selected")).toBe("false");
  });

  it("clic déclenche onChange ; l'indicateur translate selon l'index", () => {
    const onChange = vi.fn();
    render(<LuSegmented options={options} value="out" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Toutes" }));
    expect(onChange).toHaveBeenCalledWith("all");
    const indicator = screen.getByTestId("lu-segmented").firstElementChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(0%)");
    expect(indicator.style.background).toContain("var(--lu-surface-inverse)");
  });

  it("variante signed : icônes ton income/expense colorées", () => {
    render(
      <LuSegmented
        variant="signed"
        value="out"
        onChange={() => {}}
        options={[
          { value: "out", label: "Sortie", tone: "expense", icon: <span>▲</span> },
          { value: "in", label: "Entrée", tone: "income", icon: <span>▼</span> },
        ]}
      />,
    );
    const icons = screen.getAllByText("▲");
    expect((icons[0].parentElement as HTMLElement).style.color).toContain("var(--lu-expense)");
  });
});
