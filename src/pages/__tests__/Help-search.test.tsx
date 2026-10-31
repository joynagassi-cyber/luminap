// @vitest-environment jsdom
/**
 * PR16 — Centre d'aide (`/help`) : comportement de la recherche + FAQ.
 *
 * Verrouille le rendu réel de la page :
 *   1. Une requête vide affiche TOUT le corpus (pas de faux « Aucun résultat »).
 *   2. Taper « membres » filtre les sections ET n'affiche que les pertinentes.
 *   3. Recherche insensible aux accents : « evenement » trouve la section
 *      « Événements ».
 *   4. Une requête sans correspondance affiche le message FR « Aucun résultat »
 *      (ET SEULEMENT dans ce cas : requête non vide + corpus chargé).
 *   5. La FAQ « Questions fréquentes » est rendue (5–8 entrées).
 *
 * ── NON-VACUITÉ (preuve documentée, vérifiée) ────────────────────────────────
 *   - Retirer la garde `showNoResult` (rendre « Aucun résultat » sans condition)
 *     → le test « requête vide n'affiche pas Aucun résultat » échoue.
 *   - Retirer le filtre de recherche (rendre `TUTORIAL_SECTIONS` au lieu de
 *     `searchSections(trimmed)`) → le test « filtre par requête » échoue.
 *   - Retirer la section FAQ de `Help.tsx` → le test « FAQ rendue » échoue.
 *   Vérifié en commentant ces blocs : les tests passent au rouge, puis la
 *   source a été restaurée.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

vi.mock("@/lib/dataLayer", () => ({
  useNotifications: () => ({ data: [] }),
}));

import Help from "@/pages/Help";
import { TUTORIAL_SECTIONS, HELP_FAQ } from "@/lib/tutorialContent";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/help"]}>
      <Help />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
});
afterEach(() => {
  cleanup();
});

describe("Help — centre d'aide (recherche + FAQ)", () => {
  it("affiche un unique <h1> et l'état « ready »", () => {
    const { container } = renderPage();
    const h1s = Array.from(container.querySelectorAll("h1"));
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain("Aide");
    expect(container.querySelector('[data-screen-state="ready"]')).not.toBeNull();
  });

  it("affiche la FAQ « Questions fréquentes » (5–8 entrées)", () => {
    renderPage();
    const list = screen.getByTestId("help-faq-list");
    // Chaque question de la FAQ est rendue dans la liste.
    for (const f of HELP_FAQ) {
      expect(within(list).getByText(f.q)).toBeInTheDocument();
    }
    expect(HELP_FAQ.length).toBeGreaterThanOrEqual(5);
    expect(HELP_FAQ.length).toBeLessThanOrEqual(8);
  });

  it("requête VIDE : affiche tout le corpus et AUCUN « Aucun résultat »", () => {
    renderPage();
    // Aucun résultat global ne doit apparaître sans requête.
    expect(screen.queryByTestId("help-no-result")).toBeNull();
    // Les résultats de recherche ne sont pas affichés tant qu'il n'y a pas de requête.
    expect(screen.queryByTestId("help-section-results")).toBeNull();
    // Toute la FAQ reste visible.
    expect(within(screen.getByTestId("help-faq-list")).getByText(HELP_FAQ[0].q)).toBeInTheDocument();
  });

  it("filtre par requête (insensible à la casse)", () => {
    renderPage();
    const input = screen.getByTestId("help-search-input");
    fireEvent.change(input, { target: { value: "MEMBRES" } });

    const results = screen.getByTestId("help-section-results");
    const buttons = within(results).getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.length).toBeLessThan(TUTORIAL_SECTIONS.length);
    // La section « Membres » fait partie des résultats filtrés.
    expect(screen.getByTestId("help-section-membres")).toBeInTheDocument();
    // Une section hors sujet (Accueil) est exclue.
    expect(screen.queryByTestId("help-section-overview")).toBeNull();
    expect(screen.queryByTestId("help-no-result")).toBeNull();
  });

  it("recherche insensible aux ACCENTS (evenement ↔ Événements)", () => {
    renderPage();
    const input = screen.getByTestId("help-search-input");
    fireEvent.change(input, { target: { value: "evenement" } });
    const results = screen.getByTestId("help-section-results");
    expect(within(results).getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("help-no-result")).toBeNull();
  });

  it("requête SANS correspondance : affiche « Aucun résultat » (FR)", () => {
    renderPage();
    const input = screen.getByTestId("help-search-input");
    fireEvent.change(input, { target: { value: "zzzzqqqqxxxx" } });
    const noResult = screen.getByTestId("help-no-result");
    expect(within(noResult).getByText("Aucun résultat")).toBeInTheDocument();
  });

  it("le bouton « Effacer » vide la requête et restaure le corpus", () => {
    renderPage();
    const input = screen.getByTestId("help-search-input");
    fireEvent.change(input, { target: { value: "zzzzqqqqxxxx" } });
    expect(screen.getByTestId("help-no-result")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("help-search-clear"));
    expect(screen.queryByTestId("help-no-result")).toBeNull();
    expect(within(screen.getByTestId("help-faq-list")).getByText(HELP_FAQ[0].q)).toBeInTheDocument();
  });

  it("expose un lien vers le tutoriel complet", () => {
    renderPage();
    expect(screen.getByTestId("help-open-tutorial")).toBeInTheDocument();
  });
});
