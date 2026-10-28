// @vitest-environment jsdom
/**
 * R52.c — « introuvable » / « aucun » ne sont exacts qu'une fois la réplique
 * PowerSync disponible.
 *
 * Même défaut que R52.b, sur deux pages qui disposaient DÉJÀ d'un squelette
 * dédié (`MembreDetailSkeleton`, `MembresEnAvanceSkeleton`) resté non câblé :
 *  - `/membre/:id` affichait « Membre introuvable » avant le premier sync ;
 *  - `/membres/en-avance` affichait « Aucun membre en avance » ET un total
 *    à 0 (double message faux).
 *
 * La garde est celle déjà éprouvée dans `EventDetail` : `isPowerSyncReadyNow()`.
 * Ce test échoue sans le câblage (vérifié : en retirant la garde, l'assertion
 * « squelette » échoue).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// `ready` pilote la disponibilité de la réplique (le cas piégeux = false).
const state = { ready: false, loading: true };

vi.mock("@/lib/dataLayer", () => ({
  useMembers: () => ({ data: [], isLoading: false, error: undefined, retry: vi.fn() }),
  useEvents: () => ({ data: [], isLoading: false }),
  useCotisations: () => ({ data: [], isLoading: false }),
  isPowerSyncReadyNow: () => state.ready,
  useOrgBudgets: () => ({ data: [], isLoading: state.loading }),
  useOrgBudgetLines: () => ({ data: [], isLoading: state.loading }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useOrgUnits: () => ({ data: [], isLoading: false }),
  addOrgBudgetPS: vi.fn(async () => undefined),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

import MembreDetail from "@/pages/MembreDetail";
import MembresEnAvance from "@/pages/MembresEnAvance";
import Budgets from "@/pages/Budgets";

afterEach(cleanup);

describe("R52.c — /membre/:id", () => {
  it("affiche un squelette (pas « Membre introuvable ») avant le premier sync", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/membre/m-1"]}>
        <Routes>
          <Route path="/membre/:id" element={<MembreDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Membre introuvable")).toBeNull();
  });

  it("affiche « Membre introuvable » quand la réplique est disponible et le membre absent", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter initialEntries={["/membre/m-1"]}>
        <Routes>
          <Route path="/membre/:id" element={<MembreDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(screen.getByText("Membre introuvable")).toBeInTheDocument();
  });
});

describe("R52.c — /membres/en-avance", () => {
  it("affiche un squelette (pas « Aucun membre en avance ») avant le premier sync", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <MembresEnAvance />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun membre en avance")).toBeNull();
  });

  it("affiche l'état vide quand la réplique est disponible et la liste vide", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter>
        <MembresEnAvance />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(screen.getByText("Aucun membre en avance")).toBeInTheDocument();
  });
});

describe("R52.d — /budgets", () => {
  it("affiche un squelette (pas « Aucun budget ») pendant la lecture", () => {
    state.loading = true;
    const { container } = render(
      <MemoryRouter>
        <Budgets />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun budget")).toBeNull();
  });

  it("affiche l'état vide quand la lecture est terminée et la liste vide", () => {
    state.loading = false;
    const { container } = render(
      <MemoryRouter>
        <Budgets />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(screen.getByText("Aucun budget")).toBeInTheDocument();
  });
});
