// @vitest-environment jsdom
/**
 * R52.q — écrans financiers annonçant des CHIFFRES FAUX avant la 1re lecture.
 *
 * Même cause systémique que R52.l→R52.p (`isLoading` mort, D-R41), mais
 * conséquence plus grave : au lieu d'un verdict vide, l'écran affiche des
 * totaux à 0 FCFA et des graphiques vides — un trésorier lit un bilan FAUX.
 *
 *  - `/balance`  : garde `psLoading` (useTransactions) morte → `ready` + 0 FCFA
 *  - `/history`  : garde `txLoading` (useTransactions) morte → graphiques vides
 *  - `/versement`: garde `accountsLoading` (useAccounts) morte → sélecteur vide
 *
 * Chaque test échoue sans la garde (vérifié : garde retirée → `ready` affiché).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

const state = { ready: false };

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useAccounts: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useAppConfig: () => ({ config: { churchName: "Lumina" }, updateConfig: vi.fn() }),
  isPowerSyncReadyNow: () => state.ready,
  createVersement: vi.fn(async () => undefined),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  hasResolvedOrganization: () => true,
}));

vi.mock("@/capabilities/policy", () => ({
  policy: { can: () => true, assert: () => true },
}));

vi.mock("@/capabilities/notification", () => ({
  notification: { sendNotification: vi.fn(async () => undefined) },
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: true, canAccess: true, loading: false, source: "test" }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

// recharts monte un ResponsiveContainer qui exige ResizeObserver en jsdom.
vi.mock("recharts", () => {
  const Null = () => null;
  return {
    ResponsiveContainer: Null,
    Area: Null, AreaChart: Null, Bar: Null, BarChart: Null, CartesianGrid: Null,
    Cell: Null, Pie: Null, PieChart: Null, XAxis: Null, YAxis: Null, Tooltip: Null,
    Legend: Null, Line: Null, LineChart: Null, ComposedChart: Null,
    RadialBar: Null, RadialBarChart: Null,
  };
});

import Balance from "@/pages/Balance";
import History from "@/pages/History";
import Versement from "@/pages/Versement";

afterEach(cleanup);

function stateOf(container: HTMLElement): string | null {
  return container.querySelector("[data-screen-state]")?.getAttribute("data-screen-state") ?? null;
}

describe("R52.q — /balance : totaux faux avant la 1re lecture", () => {
  it("affiche l'état « loading » (pas « ready ») tant que la réplique n'a pas répondu", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Balance />
      </MemoryRouter>,
    );

    expect(stateOf(container)).toBe("loading");
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    // Les totaux ne doivent PAS être rendus : ils seraient lus comme 0 FCFA.
    expect(screen.queryByText("Bilan financier")).toBeNull();
  });

  it("affiche l'état « ready » quand la réplique est disponible (réellement aucun mouvement)", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter>
        <Balance />
      </MemoryRouter>,
    );

    expect(stateOf(container)).toBe("ready");
    expect(screen.getByText("Bilan financier")).toBeInTheDocument();
  });
});

describe("R52.q — /history : graphiques vides avant la 1re lecture", () => {
  it("affiche l'état « loading » tant que la réplique n'a pas répondu", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(stateOf(container)).toBe("loading");
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("affiche l'état « ready » quand la réplique est disponible", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );

    expect(stateOf(container)).toBe("ready");
  });
});

describe("R52.q — /versement : sélecteur de caisse vide avant la 1re lecture", () => {
  it("affiche le squelette (pas le formulaire) tant que les comptes ne sont pas lus", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Versement />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Verser à la caisse principale")).toBeNull();
  });

  it("affiche le formulaire quand la réplique est disponible", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter>
        <Versement />
      </MemoryRouter>,
    );

    expect(screen.getByText("Verser à la caisse principale")).toBeInTheDocument();
  });
});
