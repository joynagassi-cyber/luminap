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
  addOrgBudgetLinePS: vi.fn(async () => undefined),
  deleteOrgBudgetLinePS: vi.fn(async () => undefined),
  updateOrgBudgetPS: vi.fn(async () => undefined),
  useGivingCampaigns: () => ({ data: [], isLoading: false }),
  useGivingDonors: () => ({ data: [], isLoading: false }),
  usePledges: () => ({ data: [], isLoading: false }),
  useTransactionGiving: () => ({ data: [], isLoading: false }),
  addPledgePS: vi.fn(async () => undefined),
  linkTransactionGivingPS: vi.fn(async () => undefined),
  deleteTransactionGivingPS: vi.fn(async () => undefined),
  useCurrentUser: () => ({ id: "u-1", role: "TREASURIER" }),
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: true, canAccess: true, loading: false, source: "test" }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  hasResolvedOrganization: () => true,
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
import BudgetDetail from "@/pages/BudgetDetail";
import GivingCampaign from "@/pages/GivingCampaign";
import OrgRoles from "@/pages/OrgRoles";

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

describe("R52.g — pages de détail : « introuvable » avant le premier sync", () => {
  it("/budget/:id affiche un squelette, pas « Budget introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/budget/b-1"]}>
        <Routes>
          <Route path="/budget/:id" element={<BudgetDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Budget introuvable.")).toBeNull();
  });

  it("/giving/campaign/:id affiche un squelette, pas « Campagne introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/giving/campaign/c-1"]}>
        <Routes>
          <Route path="/giving/campaign/:id" element={<GivingCampaign />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Campagne introuvable.")).toBeNull();
  });

  it("/admin/roles affiche un squelette, pas « Aucun membre »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <OrgRoles />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun membre")).toBeNull();
  });
});
