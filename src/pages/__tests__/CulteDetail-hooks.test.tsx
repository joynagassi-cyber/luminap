// @vitest-environment jsdom
/**
 * Non-régression — Rules of Hooks dans `CulteDetail`.
 *
 * Défaut réel (P0, même classe que `RouteGuard` dans `App.tsx`) : deux
 * `useState` étaient déclarés APRÈS le `return` précoce `if (!culte)`. Au
 * premier rendu (`events` vide → `culte` introuvable) ces hooks n'étaient pas
 * appelés ; dès que les données arrivaient (`culte` trouvé) ils l'étaient →
 * « Rendered more hooks than during the previous render » → l'ErrorBoundary
 * racine remplaçait la page par un écran d'erreur.
 *
 * Ce test reproduit la transition « pas de données → données » : c'est
 * précisément le chemin qui plantait. Il échouerait si un hook était de nouveau
 * déclaré après un `return` précoce.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Contrôle de la présence des données, piloté par le test.
const state = { hasEvent: false };

vi.mock("@/lib/dataLayer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dataLayer")>();
  return {
    ...actual,
    useEvents: () => ({
      data: state.hasEvent
        ? [{ id: "culte-1", title: "Culte du dimanche", startDate: "2026-10-26" }]
        : [],
    }),
    useCotisations: () => ({ data: [] }),
    useMembers: () => ({ data: [] }),
    updateCotisationPS: vi.fn(async () => undefined),
  };
});

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

import CulteDetail from "@/pages/CulteDetail";

afterEach(() => cleanup());

describe("CulteDetail — Rules of Hooks (non-régression)", () => {
  it("ne plante pas au montage sans données, puis se rend quand l'événement arrive", () => {
    state.hasEvent = false;
    const { rerender } = render(
      <MemoryRouter initialEntries={["/cultes/culte-1"]}>
        <Routes>
          <Route path="/cultes/:id" element={<CulteDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    // 1er rendu : événement absent → écran « introuvable » (pas de crash).
    expect(screen.getByText("Culte introuvable")).toBeInTheDocument();

    // Les données arrivent → le composant rend maintenant la branche qui
    // appelait les hooks « en plus ». Sans le correctif, React lève
    // « Rendered more hooks than during the previous render ».
    state.hasEvent = true;
    expect(() =>
      rerender(
        <MemoryRouter initialEntries={["/cultes/culte-1"]}>
          <Routes>
            <Route path="/cultes/:id" element={<CulteDetail />} />
          </Routes>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
