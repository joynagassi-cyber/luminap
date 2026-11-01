// @vitest-environment jsdom
/**
 * ScreenGuideGallery — contrat du guide visuel (Phase 13).
 *
 * Vérifie que :
 *   - le manifeste généré est cohérent (section connue, image présente) ;
 *   - la galerie rend une figure par écran rattaché à la section, avec
 *     l'image ANNOTÉE, la légende numérotée et le texte alternatif ;
 *   - une section sans écran ne rend RIEN (pas de cadre vide).
 *
 * Non-vacuité : si l'on retire le filtre `section`, le dernier cas échoue.
 */
import { describe, it, expect, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";

import ScreenGuideGallery, {
  screensForSection,
} from "@/components/ScreenGuideGallery";
import SCREEN_GUIDE from "@/lib/screenGuide";
import { TUTORIAL_SECTIONS } from "@/lib/tutorialContent";

afterEach(cleanup);

describe("manifeste screenGuide", () => {
  it("chaque écran référence une section de tutoriel qui existe", () => {
    const known = new Set(TUTORIAL_SECTIONS.map((s) => s.id));
    for (const screen of SCREEN_GUIDE.screens) {
      if (screen.section !== null) {
        expect(
          known.has(screen.section),
          `section inconnue « ${screen.section} » pour ${screen.slug}`,
        ).toBe(true);
      }
    }
  });

  it("chaque capture (nue et annotée) existe sur le disque", () => {
    const dir = resolve(process.cwd(), "public/tutorial/screens");
    for (const screen of SCREEN_GUIDE.screens) {
      expect(
        existsSync(resolve(dir, `${screen.slug}.webp`)),
        `capture manquante : ${screen.slug}.webp`,
      ).toBe(true);
      expect(
        existsSync(resolve(dir, `${screen.slug}.ann.webp`)),
        `capture annotée manquante : ${screen.slug}.ann.webp`,
      ).toBe(true);
    }
  });

  it("chaque écran porte au moins un repère annoté et des étapes", () => {
    for (const screen of SCREEN_GUIDE.screens) {
      expect(screen.annotations.length, screen.slug).toBeGreaterThan(0);
      expect(screen.steps.length, screen.slug).toBeGreaterThan(0);
      expect(screen.purpose.length, screen.slug).toBeGreaterThan(10);
    }
  });
});

describe("ScreenGuideGallery", () => {
  it("rend une figure par écran de la section, avec l'image annotée", () => {
    const screens = screensForSection("transactions");
    expect(screens.length).toBeGreaterThan(0);

    const { container } = render(<ScreenGuideGallery sectionId="transactions" />);
    const figures = container.querySelectorAll("figure");
    expect(figures.length).toBe(screens.length);

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toMatch(/\.ann\.webp$/);
    expect(img.getAttribute("alt")).toContain("Capture annotée");
    // Légende numérotée : chaque figure liste ses propres repères.
    const expectedTotal = screens.reduce((n, s) => n + s.annotations.length, 0);
    const items = container.querySelectorAll("figcaption ol li");
    expect(items.length).toBe(expectedTotal);
    expect(
      container.querySelectorAll("figure")[0].querySelectorAll("ol li").length,
    ).toBe(screens[0].annotations.length);
  });

  it("ne rend rien pour une section sans capture", () => {
    const { container } = render(
      <ScreenGuideGallery sectionId="signaler-probleme" />,
    );
    expect(screensForSection("signaler-probleme").length).toBe(0);
    expect(
      container.querySelector('[data-testid="screen-guide-gallery"]'),
    ).toBeNull();
  });
});
