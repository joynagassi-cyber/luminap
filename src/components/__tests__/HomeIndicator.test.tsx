// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HomeIndicator from "@/components/HomeIndicator";
import { MemoryRouter } from "react-router-dom";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("HomeIndicator", () => {
  it("affiche la pastille d'accueil et l'ouvre en cliquant", () => {
    renderWithRouter(<HomeIndicator />);
    const pill = screen.getByRole("button", { name: /Voir les raccourcis utiles/i });
    expect(pill).toBeInTheDocument();
    fireEvent.click(pill);
    expect(
      screen.getByRole("dialog", { name: "Raccourcis utiles" }),
    ).toBeInTheDocument();
  });

  it("liste les features utiles (finances, membres, …)", () => {
    renderWithRouter(<HomeIndicator />);
    fireEvent.click(
      screen.getByRole("button", { name: /Voir les raccourcis utiles/i }),
    );
    expect(screen.getByText("Finances")).toBeInTheDocument();
    expect(screen.getByText("Membres")).toBeInTheDocument();
    expect(screen.getByText("Formulaires")).toBeInTheDocument();
  });

  it("ferme la modale via le bouton de fermeture", () => {
    renderWithRouter(<HomeIndicator />);
    fireEvent.click(
      screen.getByRole("button", { name: /Voir les raccourcis utiles/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(
      screen.queryByRole("dialog", { name: "Raccourcis utiles" }),
    ).not.toBeInTheDocument();
  });
});
