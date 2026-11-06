// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LuEmptyState, LuOptionList, LuSectionHeader, LuSelect } from "@/design-system/components";

afterEach(() => cleanup());

const OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

describe("LuOptionList (P2)", () => {
  it("conteneur surface-2 rayon 20 padding 6 ; item h 44, sélectionné avec coche + ombre", () => {
    render(<LuOptionList options={OPTIONS} value="weekly" onSelect={() => {}} />);
    const list = screen.getByTestId("lu-option-list");
    expect(list.style.background).toContain("var(--lu-surface-2)");
    expect(list.style.borderRadius).toContain("var(--lu-radius-lg)");
    const selected = screen.getByRole("option", { name: /weekly/i });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    expect(selected.className).toContain("h-11");
    expect(selected.style.boxShadow).toContain("var(--lu-shadow-sm)");
    expect(selected.style.fontWeight).toBe("600");
    expect(selected.querySelector("svg")).toBeTruthy(); // coche Check
    expect(screen.getByRole("option", { name: /daily/i }).getAttribute("aria-selected")).toBe("false");
  });

  it("clic sur une option déclenche onSelect avec sa valeur", () => {
    const onSelect = vi.fn();
    render(<LuOptionList options={OPTIONS} value="daily" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("option", { name: /monthly/i }));
    expect(onSelect).toHaveBeenCalledWith("monthly");
  });
});

describe("LuSelect (P2) — 3 modes", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ value: `o${i}`, label: `Option ${i}` }));
  const lots = Array.from({ length: 25 }, (_, i) => ({ value: `o${i}`, label: `Option ${i}` }));

  it("mode auto : ≤5 → liste en ligne, 6–20 → popover, >20 → sheet", () => {
    const { rerender } = render(<LuSelect label="Intervalle" value="daily" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByTestId("lu-option-list")).toBeTruthy(); // list
    expect(screen.queryByTestId("lu-select-trigger")).toBeNull();
    rerender(<LuSelect label="Intervalle" value="o0" options={many} onChange={() => {}} />);
    expect(screen.queryByTestId("lu-option-list")).toBeNull();
    expect(screen.getByTestId("lu-select-trigger")).toBeTruthy(); // popover fermé
    rerender(<LuSelect label="Intervalle" value="o0" options={lots} onChange={() => {}} />);
    expect(screen.getByTestId("lu-select-trigger")).toBeTruthy(); // sheet fermé
  });

  it("popover : ouvre au clic, sélection ferme et remonte onChange, Échap ferme", () => {
    const onChange = vi.fn();
    render(<LuSelect label="Catégorie" value="o0" options={many} onChange={onChange} />);
    const trigger = screen.getByTestId("lu-select-trigger");
    fireEvent.click(trigger);
    expect(screen.getByTestId("lu-option-list")).toBeTruthy();
    fireEvent.click(screen.getByRole("option", { name: "Option 3" }));
    expect(onChange).toHaveBeenCalledWith("o3");
    expect(screen.queryByTestId("lu-option-list")).toBeNull(); // fermé après sélection
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("lu-option-list")).toBeNull();
  });

  it("sheet (>20 options) : recherche filtre la liste", () => {
    const onChange = vi.fn();
    render(<LuSelect label="Catégorie" value="o0" options={lots} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("lu-select-trigger"));
    const dialog = screen.getByRole("dialog", { name: "Catégorie" });
    expect(dialog).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Rechercher Catégorie"), { target: { value: "option 2" } });
    // « option 2 » matche Option 2 et Option 20…24 → 6 résultats.
    expect(screen.getAllByRole("option")).toHaveLength(6);
  });

  it("champ : label dans le champ, valeur affichée, erreur sous le champ", () => {
    render(<LuSelect label="Compte" value="cash" options={[{ value: "cash", label: "Caisse principale" }, ...many]} onChange={() => {}} error="Compte requis" />);
    const trigger = screen.getByTestId("lu-select-trigger");
    expect(trigger.textContent).toContain("Compte");
    expect(trigger.textContent).toContain("Caisse principale");
    expect(screen.getByRole("alert").textContent).toContain("Compte requis");
  });
});

describe("LuSectionHeader (P2)", () => {
  it("titre 17/700 + lien d'action accent à droite qui déclenche onAction", () => {
    const onAction = vi.fn();
    render(<LuSectionHeader title="Derniers mouvements" actionLabel="Voir tout" onAction={onAction} meta="3 Total" />);
    const title = screen.getByText("Derniers mouvements");
    expect(title.tagName).toBe("H2");
    expect(title.className).toContain("text-[17px]");
    expect(title.className).toContain("font-bold");
    fireEvent.click(screen.getByRole("button", { name: "Voir tout" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Voir tout" }).style.color).toContain("var(--lu-accent)");
    expect(screen.getByText("3 Total")).toBeTruthy();
  });
});

describe("LuEmptyState (P2)", () => {
  it("illustration tokenisée 160px + titre 16/600 + texte muted + CTA", () => {
    const onCta = vi.fn();
    render(<LuEmptyState title="You have nothing to do now." text="You have nothing to do in a while." ctaLabel="Add" onCta={onCta} />);
    const root = screen.getByTestId("lu-empty-state");
    const art = root.querySelector("div") as HTMLElement;
    expect(art.className).toContain("h-[160px]");
    expect(art.className).toContain("w-[160px]");
    expect(art.style.background).toContain("var(--lu-surface-2)");
    const svg = art.querySelector("svg")!;
    expect((svg as unknown as HTMLElement).style.color).toContain("var(--lu-fg-subtle)");
    expect(screen.getByText("You have nothing to do now.").className).toContain("font-semibold");
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
