// @vitest-environment jsdom
/**
 * ScreenCapture — une illustration absente ne doit pas casser le tutoriel.
 *
 * Cas réel : le tutoriel est livré AVANT que les captures ne soient générées.
 * L'image renvoie alors 404. Afficher une icône cassée dans un écran d'aide
 * destiné à des utilisateurs non techniciens serait pire que pas d'image.
 *
 * Ce test vérifie donc la dégradation silencieuse, ET le cas nominal une fois
 * la capture disponible.
 */
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import ScreenCapture from "../ScreenCapture";

afterEach(cleanup);

/** Déclenche l'événement `error` que le navigateur émet sur un 404 d'image. */
function failImage(img: HTMLElement) {
  fireEvent.error(img);
}

describe("ScreenCapture", () => {
  it("affiche la capture et sa légende quand l'écran existe", () => {
    render(<ScreenCapture howtoId="inviter-membre" />);

    const img = screen.getByRole("img", { name: /Créer une invitation/i });
    expect(img).toHaveAttribute("src", "/captures/invitation-emit.png");
    expect(screen.getByText(/Créer une invitation/)).toBeInTheDocument();
  });

  it("affiche le repère visuel en légende (ce que l'utilisateur doit reconnaître)", () => {
    render(<ScreenCapture howtoId="inviter-membre" />);
    // La légende reprend `hint` du manifeste : c'est elle qui guide l'œil.
    expect(screen.getByText(/Choix du rôle, de la portée/i)).toBeInTheDocument();
  });

  it("ne rend rien pour un parcours sans capture déclarée", () => {
    const { container } = render(<ScreenCapture howtoId="parcours-inexistant" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("retire l'image si le fichier est absent (404), sans icône cassée", () => {
    const { container } = render(<ScreenCapture howtoId="inviter-membre" />);
    expect(screen.getByRole("img")).toBeInTheDocument();

    failImage(screen.getByRole("img"));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("réduit le décalage de mise en page (dimensions connues après chargement)", () => {
    render(<ScreenCapture howtoId="inviter-membre" />);
    const img = screen.getByRole("img");
    // `loading="lazy"` évite de télécharger toutes les captures d'un coup.
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });
});
