// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bell, Plus, ShoppingCart } from "lucide-react";
import { LuBadge, LuButton, LuChip, LuDelta, LuIconButton } from "@/design-system/components";

afterEach(() => cleanup());

describe("LuButton (P2)", () => {
  it("rend le libellé et déclenche onClick", () => {
    const onClick = vi.fn();
    render(<LuButton onClick={onClick}>Continuer</LuButton>);
    fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("primary : fond accent + texte on-accent, hauteur lg 52, pill", () => {
    render(<LuButton variant="primary" size="lg">Valider</LuButton>);
    const btn = screen.getByRole("button", { name: /valider/i });
    expect(btn.style.background).toContain("var(--lu-accent)");
    expect(btn.style.color).toContain("var(--lu-on-accent)");
    expect(btn.style.height).toBe("52px");
    expect(btn.style.borderRadius).toContain("var(--lu-radius-pill)");
    // pressed : la classe active applique --lu-accent-pressed
    expect(btn.className).toContain("active:bg-[var(--lu-accent-pressed)]");
    // anneau focus en --lu-focus-ring (spec §5)
    expect(btn.style.outlineColor).toContain("var(--lu-focus-ring)");
  });

  it("outline : bordure 1.5px accent, fond transparent ; tonal : accent-soft", () => {
    render(<LuButton variant="outline">Passer</LuButton>);
    const outline = screen.getByRole("button", { name: /passer/i });
    expect(outline.style.border).toContain("1.5px solid var(--lu-accent)");
    expect(outline.style.background).toBe("transparent");
  });

  it("tailles : md 44 / sm 32 ; shape rounded = pleine largeur h 48 rayon 12", () => {
    render(<LuButton size="md">A</LuButton>);
    expect(screen.getByRole("button", { name: "A" }).style.height).toBe("44px");
    cleanup();
    render(<LuButton size="sm" shape="rounded">B</LuButton>);
    const b = screen.getByRole("button", { name: "B" });
    expect(b.style.height).toBe("48px");
    expect(b.style.width).toBe("100%");
    expect(b.style.borderRadius).toContain("var(--lu-radius-md)");
  });

  it("disabled : opacité .4 et clic bloqué", () => {
    const onClick = vi.fn();
    render(<LuButton disabled onClick={onClick}>X</LuButton>);
    const btn = screen.getByRole("button", { name: "X" });
    expect(btn).toHaveProperty("disabled", true);
    expect(btn.style.opacity).toBe("0.4");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading : spinner à la place de l'icône, aria-busy, clic bloqué", () => {
    const onClick = vi.fn();
    render(<LuButton loading onClick={onClick}>Envoi</LuButton>);
    const btn = screen.getByRole("button", { name: /envoi/i });
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByTestId("lu-button-spinner")).toBeTruthy();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("LuIconButton (P2)", () => {
  it("rend l'icône, exige aria-label, déclenche onClick", () => {
    const onClick = vi.fn();
    render(<LuIconButton aria-label="Notifications" icon={<Bell size={20} />} onClick={onClick} />);
    const btn = screen.getByRole("button", { name: "Notifications" });
    expect(btn.style.width).toBe("40px");
    expect(btn.style.border).toContain("var(--lu-border-strong)");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("variant filled : fond surface-2 sans bordure", () => {
    render(<LuIconButton variant="filled" aria-label="Ajouter" icon={<Plus size={20} />} />);
    const btn = screen.getByRole("button", { name: "Ajouter" });
    expect(btn.style.background).toContain("var(--lu-surface-2)");
  });
});

describe("LuChip (P2)", () => {
  it("non sélectionné : surface + bordure ; sélectionné : accent + on-accent, aria-pressed", () => {
    const { rerender } = render(<LuChip icon={<ShoppingCart size={16} />}>Courses</LuChip>);
    const chip = screen.getByRole("button", { name: /courses/i });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    expect(chip.style.background).toContain("var(--lu-surface)");
    expect(chip.style.borderColor).toContain("var(--lu-border)");

    rerender(<LuChip selected>Courses</LuChip>);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.style.background).toContain("var(--lu-accent)");
    expect(chip.style.color).toContain("var(--lu-on-accent)");
  });

  it("hauteur 32 pill (snap sur la rangée)", () => {
    render(<LuChip>Taille</LuChip>);
    const chip = screen.getByRole("button", { name: "Taille" });
    expect(chip.className).toContain("h-8");
    expect(chip.className).toContain("snap-start");
  });
});

describe("LuBadge / LuDelta (P2)", () => {
  it("variantes soft : fonds *-soft et couleur sémantique", () => {
    render(<LuBadge variant="soft-income">Actif</LuBadge>);
    const badge = screen.getByText("Actif");
    expect(badge.style.background).toContain("var(--lu-income-soft)");
    expect(badge.style.color).toContain("var(--lu-income)");
    expect(badge.className).toContain("h-6");
  });

  it("LuDelta : signe + icône + couleur (jamais la couleur seule, §0.4)", () => {
    render(<LuDelta positive>+12 500 XOF</LuDelta>);
    const delta = screen.getByText("+12 500 XOF");
    expect(delta.style.background).toContain("var(--lu-income-soft)");
    expect(delta.querySelector("svg")).toBeTruthy();
    cleanup();
    render(<LuDelta positive={false}>−3 200 XOF</LuDelta>);
    expect(screen.getByText("−3 200 XOF").style.color).toContain("var(--lu-expense)");
  });

  it("on-hero : translucide (glass) sur carte hero", () => {
    render(<LuBadge variant="on-hero">Nouveau</LuBadge>);
    const badge = screen.getByText("Nouveau");
    expect(badge.style.background).toContain("var(--lu-glass-bg)");
    expect(badge.style.color).toContain("var(--lu-hero-fg)");
  });
});
