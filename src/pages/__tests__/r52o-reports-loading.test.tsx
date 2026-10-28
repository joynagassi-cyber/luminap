// @vitest-environment jsdom
/**
 * R52.o — `/reports` annonçait « Aucun rapport personnalisé » avant la fin de
 * `reportDefinitionRepo.list()` (lecture asynchrone).
 *
 * Cas précis : la réplique PowerSync EST prête et des transactions existent
 * (donc le tableau de bord a bien des données), mais la liste des rapports
 * personnalisés est encore en cours de lecture → l'utilisateur croyait avoir
 * perdu ses rapports.
 *
 * Le test échoue sans la garde `savedLoaded` (retirer le `finally` qui la pose
 * fait réapparaître le verdict faux).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Lecture des rapports personnalisés : jamais résolue (fenêtre de chargement).
vi.mock("@/lib/reporting", () => ({
  reportDefinitionRepo: { list: vi.fn(() => new Promise(() => undefined)) },
}));

vi.mock("@/lib/dataLayer", () => ({
  // Des transactions existent → l'écran n'est pas masqué par la garde globale.
  useTransactions: () => ({
    data: [{ id: "t-1", status: "APPROVED", type: "INCOME", amount: 1000, date: "2026-01-01" }],
    isLoading: false,
  }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useAppConfig: () => ({ config: { churchName: "Lumina", churchLogoUrl: "" }, updateConfig: vi.fn() }),
  useCurrentUser: () => ({ id: "u-1", role: "TREASURIER", org: { id: "org-1" } }),
  isPowerSyncReadyNow: () => true,
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: true, canAccess: true, loading: false, source: "test" }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("@/components/CapabilityBanner", () => ({ default: () => null }));
vi.mock("recharts", () => {
  const Null = () => null;
  return {
    ResponsiveContainer: Null,
    Area: Null, AreaChart: Null, Bar: Null, BarChart: Null, CartesianGrid: Null,
    Cell: Null, Pie: Null, PieChart: Null, XAxis: Null, YAxis: Null, Tooltip: Null,
    Legend: Null, Line: Null, LineChart: Null, RadialBar: Null, RadialBarChart: Null,
  };
});

import Reports from "@/pages/Reports";

afterEach(cleanup);

describe("R52.o — /reports : lecture des rapports personnalisés en cours", () => {
  it("affiche un squelette, pas « Aucun rapport personnalisé »", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/reports"]}>
        <Reports />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun rapport personnalisé")).toBeNull();
  });
});
