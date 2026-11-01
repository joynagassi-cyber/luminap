// @vitest-environment jsdom
/**
 * BadgeGallery — fumigation : la galerie se rend sans erreur et expose chaque
 * section de statuts. Elle sert de banc d'essai visuel dans Réglages › Thème ;
 * un nom d'icône invalide ou une table cassée ferait échouer ce rendu.
 */
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup, screen } from "@testing-library/react";

import BadgeGallery from "@/components/BadgeGallery";

afterEach(cleanup);

describe("BadgeGallery", () => {
  it("se rend et expose le conteneur de test", () => {
    render(<BadgeGallery />);
    expect(screen.getByTestId("badge-gallery")).toBeInTheDocument();
  });

  it("affiche les sections de statuts du domaine", () => {
    render(<BadgeGallery />);
    for (const title of ["Transactions", "Événements", "Membres", "Organisations"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("rend des badges tokenisés (texte var(--…), fond color-mix)", () => {
    const { container } = render(<BadgeGallery />);
    const badges = container.querySelectorAll("span[aria-label^='Statut']");
    expect(badges.length).toBeGreaterThan(20);
    const approved = screen.getAllByText("Approuvé")[0];
    expect(approved).toHaveStyle({ color: "var(--data-income)" });
  });
});
