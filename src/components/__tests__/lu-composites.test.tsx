// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home, List, PieChart, Plus, Settings, ShoppingBag } from "lucide-react";
import { LuAppBar, LuHero, LuTabBar, LuTransactionRow } from "@/design-system/components";

afterEach(() => cleanup());

describe("LuHero (P3) — 3 variantes", () => {
  it("solid : aplat hero-bg, coins bas 32, textes hero-fg, badge on-hero, bloc imbriqué overlay", () => {
    render(
      <LuHero variant="solid" greeting="Bonjour, Aïcha" label="Solde total" amount={142830} delta={{ positive: true, children: "+12 %" }} onBell={() => {}}>
        <p>Bloc imbriqué</p>
      </LuHero>,
    );
    const hero = screen.getByTestId("lu-hero");
    expect(hero.style.background).toContain("var(--lu-hero-bg)");
    expect(hero.style.borderRadius).toContain("var(--lu-radius-2xl)");
    expect(hero.textContent).toContain("Bonjour, Aïcha");
    expect(hero.textContent).toContain("Solde total");
    expect(hero.textContent).toContain("142"); // montant formaté fr-FR
    expect(hero.textContent).toContain("+12 %");
    expect(hero.textContent).toContain("Bloc imbriqué");
    // bloc imbriqué en overlay 10 %
    const nested = hero.querySelector("div.mt-4") as HTMLElement;
    expect(nested.style.background).toContain("var(--lu-overlay-ink)");
    expect(nested.style.borderRadius).toContain("var(--lu-radius-lg)");
  });

  it("tinted : zone accent-soft + carte surface qui remonte (coins hauts 28)", () => {
    render(<LuHero variant="tinted" label="Solde total" amount={142830} />);
    const hero = screen.getByTestId("lu-hero");
    expect(hero.style.background).toContain("var(--lu-accent-soft)");
    const card = hero.querySelector("div.px-5") as HTMLElement;
    expect(card.style.background).toContain("var(--lu-surface)");
    expect(card.style.borderRadius).toContain("var(--lu-radius-xl)");
  });

  it("dark-orb : carte orb-bg r24, valeur en accent-vivid, orbe flou, bouton blanc pill", () => {
    const onAction = vi.fn();
    render(<LuHero variant="dark-orb" label="Vous avez dépensé" amount={48500} actionLabel="Voir détails" onAction={onAction} />);
    const hero = screen.getByTestId("lu-hero");
    expect(hero.style.background).toContain("var(--lu-orb-bg)");
    expect(hero.style.borderRadius).toContain("var(--lu-radius-lg)");
    expect(hero.textContent).toContain("Insight");
    expect(hero.textContent).toContain("48");
    const vivid = hero.querySelector("p > span") as HTMLElement;
    expect(vivid.style.color).toContain("var(--lu-accent-vivid)");
    const orb = hero.querySelector("div.absolute") as HTMLElement;
    expect(orb.style.filter).toContain("blur(24px)");
    fireEvent.click(screen.getByRole("button", { name: /voir détails/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe("LuAppBar (P3)", () => {
  it("3 slots : retour | titre centré 16/600 | actions ; variante solid avec bordure", () => {
    const onBack = vi.fn();
    render(<LuAppBar title="Détail" onBack={onBack} actions={<button aria-label="Editer">✎</button>} />);
    const bar = screen.getByTestId("lu-app-bar");
    expect(bar.style.background).toContain("var(--lu-surface)");
    expect(bar.style.borderBottom).toContain("var(--lu-border)");
    expect(screen.getByText("Détail").className).toContain("font-semibold");
    fireEvent.click(screen.getByLabelText("Retour"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("variante tinted sans bordure + grand titre 28/700 avec méta « 3 Total »", () => {
    render(<LuAppBar variant="tinted" title="Historique" large meta="3 Total" />);
    const bar = screen.getByTestId("lu-app-bar");
    expect(bar.style.background).toContain("var(--lu-accent-soft)");
    expect(bar.style.borderBottom).not.toContain("var(--lu-border)");
    const title = screen.getByText("Historique");
    expect(title.tagName).toBe("SPAN");
    expect(title.style.fontSize).toBe("28px");
    expect(screen.getByText("3 Total")).toBeTruthy();
  });
});

describe("LuTransactionRow (P3)", () => {
  it("carte surface r16, icône en conteneur surface-2, titre 15/600, montant signé + ▲/▼", () => {
    render(<LuTransactionRow title="Super U" subtitle="Aujourd'hui · 14:32" icon={<ShoppingBag size={20} />} amount={-12500} />);
    const row = screen.getByTestId("lu-transaction-row");
    expect(row.style.background).toContain("var(--lu-surface)");
    expect(row.className).toContain("rounded-[var(--lu-radius-md)]");
    expect(screen.getByText("Super U").className).toContain("text-[15px]");
    expect(screen.getByText("Super U").className).toContain("font-semibold");
    expect(row.textContent).toMatch(/12.500/); // séparateur U+202F
    expect(row.textContent).toContain("▼");
  });

  it("montant positif = ▲ income ; variante chevron ; grouped = séparateur sans carte", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <LuTransactionRow title="Salaire" icon={<Plus size={20} />} amount={250000} chevron onClick={onClick} />,
    );
    const row = screen.getByTestId("lu-transaction-row");
    expect(row.textContent).toContain("▲");
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<LuTransactionRow grouped title="Courses" icon={<ShoppingBag size={20} />} count={9} />);
    const grouped = screen.getByTestId("lu-transaction-row");
    expect(grouped.style.background).toBe("transparent");
    expect(grouped.style.borderTop).toContain("var(--lu-border)");
    expect(grouped.textContent).toContain("9 transactions");
  });
});

describe("LuTabBar (P3) — barre flottante HTML native", () => {
  const tabs = [
    { id: "home", label: "Accueil", icon: <Home size={22} /> },
    { id: "history", label: "Historique", icon: <List size={22} /> },
    { id: "stats", label: "Stats", icon: <PieChart size={22} /> },
    { id: "settings", label: "Réglages", icon: <Settings size={22} /> },
  ];

  it("flottante : surface + ombre lg + rayon 32 ; actif pill-active = pastille accent 64×44 icône seule", () => {
    render(<LuTabBar tabs={tabs} active="home" onSelect={() => {}} activeStyle="pill-active" />);
    const bar = screen.getByTestId("lu-tab-bar");
    expect(bar.className).toContain("fixed");
    expect(bar.style.background).toContain("var(--lu-surface)");
    expect(bar.style.boxShadow).toContain("var(--lu-shadow-lg)");
    expect(bar.style.borderRadius).toContain("var(--lu-radius-2xl)");
    // onglet actif pill-active : icône seule, sans label → on le retrouve via aria-current
    const activeBtn = screen.getAllByRole("button").find((b) => b.getAttribute("aria-current") === "page")!;
    expect(activeBtn.textContent).not.toContain("Accueil"); // pastille = icône seule
    expect(activeBtn.querySelector("svg")).toBeTruthy();
    expect(activeBtn.style.background).toContain("var(--lu-accent)");
    expect(activeBtn.style.minWidth).toBe("64px");
    expect(activeBtn.style.color).toContain("var(--lu-on-accent)");
    // inactif : icône muted, pas de pastille
    const inactive = screen.getByRole("button", { name: /stats/i });
    expect(inactive.style.background).toBe("transparent");
    expect(inactive.style.color).toContain("var(--lu-fg-muted)");
  });

  it("soft-active : pastille accent-soft + label accent ; clic déclenche onSelect", () => {
    const onSelect = vi.fn();
    render(<LuTabBar tabs={tabs} active="stats" onSelect={onSelect} activeStyle="soft-active" />);
    const activeBtn = screen.getByRole("button", { name: /stats/i });
    expect(activeBtn.style.background).toContain("var(--lu-accent-soft)");
    expect(activeBtn.style.color).toContain("var(--lu-accent)");
    fireEvent.click(screen.getByRole("button", { name: /réglages/i }));
    expect(onSelect).toHaveBeenCalledWith("settings");
  });
});
