// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Bell, Flame } from "lucide-react";
import { LuBanner, LuFab, LuProgress, LuSwipeToConfirm } from "@/design-system/components";

afterEach(() => cleanup());

describe("LuBanner (P3)", () => {
  it("fond accent-soft, texte 13/500, fermable avec ✕", () => {
    const onDismiss = vi.fn();
    render(<LuBanner title="Complétez votre profil" dismissible onDismiss={onDismiss} />);
    const banner = screen.getByTestId("lu-banner");
    expect(banner.style.background).toContain("var(--lu-accent-soft)");
    expect(screen.getByText("Complétez votre profil").className).toContain("text-[13px]");
    fireEvent.click(screen.getByLabelText("Fermer"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("variante action pleine largeur : cercle icône + titre + sous-titre + chevron, cliquable", () => {
    const onClick = vi.fn();
    render(<LuBanner action title="Voir le rapport mensuel" subtitle="Octobre 2026" icon={<Flame size={20} />} onClick={onClick} />);
    const banner = screen.getByTestId("lu-banner");
    expect(banner.tagName).toBe("BUTTON");
    expect(banner.textContent).toContain("Voir le rapport mensuel");
    expect(banner.textContent).toContain("Octobre 2026");
    expect(banner.querySelector("svg")).toBeTruthy();
    fireEvent.click(banner);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("LuProgress (P3)", () => {
  it("piste surface-2 h8 pill, remplissage dégradé tronqué à la valeur, role=progressbar", () => {
    render(<LuProgress value={33} startLabel="1 nov" endLabel="30 nov" legend="10 / 30 jours" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.style.background).toContain("var(--lu-surface-2)");
    expect(bar.className).toContain("h-2");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("33%");
    expect(fill.style.background).toContain("var(--lu-progress-fill)");
    expect(bar.getAttribute("aria-valuenow")).toBe("33");
    expect(screen.getByText("1 nov")).toBeTruthy();
    expect(screen.getByText("30 nov")).toBeTruthy();
  });

  it("variante budget : titre 14 muted + montant + « (33 %) restant »", () => {
    render(<LuProgress value={67} title="Budget courses" amount={80000} />);
    expect(screen.getByText("Budget courses").style.color).toContain("var(--lu-fg-muted)");
    const root = screen.getByTestId("lu-progress");
    expect(root.textContent).toMatch(/80.000/);
    expect(root.textContent).toContain("(67 %) restant");
  });

  it("valeur bornée à [0, 100]", () => {
    render(<LuProgress value={140} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });
});

describe("LuFab (P3)", () => {
  it("56px fixe au-dessus de la tab bar, cercle accent + ombre lg, clic", () => {
    const onClick = vi.fn();
    render(<LuFab onClick={onClick} />);
    const fab = screen.getByTestId("lu-fab");
    expect(fab.className).toContain("h-14");
    expect(fab.className).toContain("w-14");
    expect(fab.className).toContain("fixed");
    expect(fab.style.background).toContain("var(--lu-accent)");
    expect(fab.style.boxShadow).toContain("var(--lu-shadow-lg)");
    expect(fab.style.borderRadius).toContain("var(--lu-radius-pill)");
    fireEvent.click(fab);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shape square = rayon 16", () => {
    render(<LuFab onClick={() => {}} shape="square" />);
    expect(screen.getByTestId("lu-fab").style.borderRadius).toContain("var(--lu-radius-md)");
  });
});

describe("LuSwipeToConfirm (P3)", () => {
  it("piste pill h56 surface-inverse, pouce 48 accent, libellé centré, double chevron", () => {
    render(<LuSwipeToConfirm label="Glisser pour clôturer" onConfirm={() => {}} />);
    const track = screen.getByTestId("lu-swipe");
    expect(track.style.background).toContain("var(--lu-surface-inverse)");
    expect(track.className).toContain("h-14");
    expect(screen.getByText("Glisser pour clôturer")).toBeTruthy();
    const thumb = screen.getByTestId("lu-swipe-thumb");
    expect(thumb.className).toContain("h-12");
    expect(thumb.style.background).toContain("var(--lu-accent)");
  });

  it("alternative accessible : Entrée sur le pouce confirme", () => {
    const onConfirm = vi.fn();
    render(<LuSwipeToConfirm label="Valider" onConfirm={onConfirm} />);
    fireEvent.keyDown(screen.getByTestId("lu-swipe-thumb"), { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Confirmé ✓")).toBeTruthy();
  });

  it("glisser à ≥85 % de la course confirme ; en dessous, retour élastique sans confirmer", () => {
    const onConfirm = vi.fn();
    render(<LuSwipeToConfirm label="Envoyer" onConfirm={onConfirm} />);
    const track = screen.getByTestId("lu-swipe");
    const thumb = screen.getByTestId("lu-swipe-thumb");
    // jsdom : offsetWidth = 0 → maxDx = -56, on simule via getBoundingClientRect
    track.getBoundingClientRect = () => ({ left: 0, width: 300, ...{} } as DOMRect);
    Object.defineProperty(track, "offsetWidth", { value: 300, configurable: true });
    // course insuffisante (100px < 85% de 244)
    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 24 });
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: 124 });
    fireEvent.pointerUp(thumb, { pointerId: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
    // course suffisante (240px ≥ 85% de 244)
    fireEvent.pointerDown(thumb, { pointerId: 2, clientX: 24 });
    fireEvent.pointerMove(thumb, { pointerId: 2, clientX: 264 });
    fireEvent.pointerUp(thumb, { pointerId: 2 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
