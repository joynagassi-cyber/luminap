// @vitest-environment jsdom
/**
 * Phase 8 — garde du sink `dangerouslySetInnerHTML` de ChartContainer.
 *
 * `ChartContainer` construit une feuille de style en chaîne et l'injecte via
 * `dangerouslySetInnerHTML`. Aujourd'hui les couleurs viennent du thème
 * (développeur), mais le sink doit rester sûr même si une valeur hostile y
 * arrive : ce test injecte une couleur/`id` capables de fermer la balise
 * `<style>` et d'injecter du balisage, et vérifie qu'aucun nœud hostile
 * n'apparaît dans le DOM.
 *
 * Ce test ÉCHOUE sans la neutralisation (`sanitizeCssValue`) dans chart.tsx.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render } from "@testing-library/react";
import { ChartContainer } from "@/components/ui/chart";

// jsdom ne fournit pas ResizeObserver (utilisé par ResponsiveContainer).
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

describe("ChartContainer — sink dangerouslySetInnerHTML", () => {
  it("neutralise une couleur capable de fermer </style> et d'injecter du HTML", () => {
    const { container } = render(
      <ChartContainer
        config={{
          evil: { color: "red}</style><img src=x onerror=alert(1)>" },
        }}
      >
        <div />
      </ChartContainer>,
    );

    // Aucun nœud injecté : l'<img> hostile ne doit pas exister dans le DOM.
    expect(container.querySelector("img")).toBeNull();

    const style = container.querySelector("style");
    expect(style).not.toBeNull();
    const cssText = style?.textContent ?? "";
    // Les fragments de sortie de contexte ont disparu ; la valeur hostile est
    // réduite à du texte inerte (aucune balise, aucune règle injectée).
    expect(cssText).not.toContain("<");
    expect(cssText).not.toContain(">");
    expect(cssText).not.toContain("</style>");
    expect(cssText).not.toContain("red}");
  });

  it("neutralise un id de chart hostile", () => {
    const { container } = render(
      <ChartContainer
        id="x]{}<script>alert(1)</script>"
        config={{ a: { color: "#fff" } }}
      >
        <div />
      </ChartContainer>,
    );
    const cssText = container.querySelector("style")?.textContent ?? "";
    expect(cssText).not.toContain("<script>");
    expect(cssText).not.toContain("<");
    expect(cssText).not.toContain("]{}");
  });

  it("conserve une couleur légitime", () => {
    const { container } = render(
      <ChartContainer config={{ a: { color: "var(--data-income)" } }}>
        <div />
      </ChartContainer>,
    );
    const cssText = container.querySelector("style")?.textContent ?? "";
    expect(cssText).toContain("var(--data-income)");
  });
});
