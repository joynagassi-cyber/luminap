// @vitest-environment jsdom
/**
 * Badge — contrat du composant (Phase 10 : design tokens).
 *
 * Vérifie que :
 *   - la couleur de texte et la teinte de fond proviennent de TOKENS
 *     (`var(--…)` / `color-mix`), jamais d'un hex brut → le badge suit le
 *     mode clair/sombre et la couleur de marque sans code spécifique ;
 *   - le libellé FR et l'icône « prête à l'emploi » sont rendus ;
 *   - `spec`, `table`/`value`, et la forme `tone`/`label`/`icon` produisent le
 *     même rendu, et le repli neutre affiche la valeur brute ;
 *   - `dot`, `variant="outline"`, `size` et `live` modifient le rendu.
 */
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";

import Badge from "@/components/Badge";
import { MEMBER_BADGES, TRANSACTION_BADGES } from "@/lib/badges";

afterEach(cleanup);

describe("Badge — tokenisation", () => {
  it("tone='success' : texte var(--data-income) et fond color-mix (tint)", () => {
    const { container } = render(<Badge tone="success" label="Actif" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("Actif");
    expect(badge.style.color).toBe("var(--data-income)");
    expect(badge.style.backgroundColor).toContain("color-mix");
    expect(badge.style.backgroundColor).toContain("var(--data-income)");
  });

  it("tone='accent' suit la couleur de marque (var(--accent-primary))", () => {
    const { container } = render(<Badge tone="accent" label="Nouveau" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge.style.color).toBe("var(--accent-primary)");
  });

  it("aucune couleur brute (hex/rgb) dans le style du badge", () => {
    const { container } = render(<Badge tone="danger" label="Rejeté" />);
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge.getAttribute("style") ?? "").not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
  });
});

describe("Badge — contenu", () => {
  it("rend le libellé FR explicite", () => {
    const { container } = render(<Badge tone="warning" label="En attente" />);
    expect(container.querySelector("span")).toHaveTextContent("En attente");
  });

  it("rend une icône « prête à l'emploi » (svg) quand `icon` est fourni", () => {
    const { container } = render(<Badge tone="success" label="Actif" icon="checkCircle" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("n'affiche pas d'icône quand `icon` est null", () => {
    const { container } = render(<Badge tone="success" label="Actif" icon={null} />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("expose aria-label 'Statut : …'", () => {
    const { container } = render(<Badge tone="success" label="Approuvé" />);
    expect(container.querySelector("span")).toHaveAttribute(
      "aria-label",
      "Statut : Approuvé",
    );
  });
});

describe("Badge — formes d'usage", () => {
  it("`spec` rend la même chose que tone/label/icon", () => {
    const { container: a } = render(<Badge spec={MEMBER_BADGES.ACTIVE} />);
    const { container: b } = render(
      <Badge tone="success" label="Actif" icon="checkCircle" />,
    );
    expect(a.querySelector("span")).toHaveTextContent("Actif");
    expect(a.querySelector("span")?.getAttribute("style")).toBe(
      b.querySelector("span")?.getAttribute("style"),
    );
  });

  it("`table` + `value` résout le badge du statut", () => {
    const { container } = render(
      <Badge table={TRANSACTION_BADGES} value="APPROVED" />,
    );
    expect(container.querySelector("span")).toHaveTextContent("Approuvé");
  });

  it("`table` + valeur inconnue → repli neutre affichant la valeur brute", () => {
    const { container } = render(
      <Badge table={TRANSACTION_BADGES} value="__INCONNU__" />,
    );
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge).toHaveTextContent("__INCONNU__");
    expect(badge.style.color).toBe("var(--text-secondary)");
  });
});

describe("Badge — variantes & options", () => {
  it("size='md' utilise text-sm ; size='xs' utilise text-[10px]", () => {
    const { container: md } = render(<Badge tone="info" label="x" size="md" />);
    expect(md.querySelector("span")?.className).toContain("text-sm");
    const { container: xs } = render(<Badge tone="info" label="x" size="xs" />);
    expect(xs.querySelector("span")?.className).toContain("text-[10px]");
  });

  it("variant='outline' : bordure teintée, fond transparent", () => {
    const { container } = render(
      <Badge tone="danger" label="Rejeté" variant="outline" />,
    );
    const badge = container.querySelector("span") as HTMLElement;
    expect(badge.style.backgroundColor).toBe("transparent");
    expect(badge.style.border).toContain("color-mix");
  });

  it("`dot` affiche une pastille colorée sans icône", () => {
    const { container } = render(<Badge tone="warning" label="En attente" dot />);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
    const dotEl = container.querySelectorAll("span > span")[0] as HTMLElement;
    expect(dotEl.style.backgroundColor).toBe("var(--data-pending)");
  });

  it("`live` expose role='status' (région vivante)", () => {
    const { container } = render(<Badge tone="info" label="Sync" live />);
    expect(container.querySelector("span")).toHaveAttribute("role", "status");
  });
});
