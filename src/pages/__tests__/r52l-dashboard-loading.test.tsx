// @vitest-environment jsdom
/**
 * R52.l — `/dashboard` (écran d'accueil) annonçait « Pas encore de mouvement »
 * avant la première lecture PowerSync. C'est le PREMIER écran vu après
 * connexion : le message est un fait faux (l'utilisateur croit que son
 * historique est vide) tant que la réplique n'est pas prête.
 *
 * Le fichier portait un squelette (`DashboardSkeleton`) mais uniquement sur la
 * branche `isLoading` — or `useTransactions()` renvoie `isLoading: false` en
 * dur (état de chargement temporel retiré, décision D-R41) : cette branche est
 * du code mort, donc aucun squelette n'était jamais rendu.
 *
 * Le test échoue sans le correctif (retirer la garde `replicaPending` fait
 * réapparaître « Pas encore de mouvement »).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
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
  useEvents: () => ({ data: [], isLoading: false }),
  useAccounts: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useReportsReceived: () => ({ data: [], isLoading: false }),
  useOrganizations: () => ({ data: [], isLoading: false }),
  useMembers: () => ({ data: [], isLoading: false, error: undefined, retry: vi.fn() }),
  useInvitations: () => ({ data: [], isLoading: false }),
  useAppConfig: () => ({
    config: { churchName: "Lumina", churchLogoUrl: "", userPhoto: "" },
    updateConfig: vi.fn(async () => undefined),
  }),
  useCurrentUser: () => ({
    id: "u-1",
    firstName: "Test",
    lastName: "User",
    role: "TREASURIER",
    org: { id: "org-1", name: "Lumina" },
  }),
  markReportRead: vi.fn(async () => undefined),
  parseBudgetItems: () => [],
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/lib/organization-context", () => ({
  useOrganizationContext: () => ({ orgId: "org-1", resolved: true }),
  useMyOrgs: () => ({ data: [{ id: "org-1", name: "Lumina" }] }),
  enterOrganization: vi.fn(async () => ({ orgId: "org-1" })),
}));

// Sous-composants lourds (recharts) ou sans rapport avec l'état testé.
vi.mock("@/components/TrendChart", () => ({ default: () => null }));
vi.mock("@/components/OrgSwitcher", () => ({ default: () => null }));
vi.mock("@/components/DashboardOnboarding", () => ({ default: () => null }));

vi.mock("@/lib/hooks/usePowerSyncIndicator", () => ({
  usePowerSyncIndicator: () => ({
    online: true,
    lastSyncAt: null,
    syncing: false,
    syncError: null,
  }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));

import Dashboard from "@/pages/Dashboard";

afterEach(cleanup);
beforeEach(() => {
  state.ready = false;
});

describe("R52.l — /dashboard : « Pas encore de mouvement » avant la 1re lecture", () => {
  it("affiche un squelette, pas « Pas encore de mouvement », tant que la réplique n'est pas prête", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Pas encore de mouvement")).toBeNull();
  });

  it("affiche l'état vide réel quand la réplique est prête et l'historique vide", () => {
    state.ready = true;
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(screen.getByText("Pas encore de mouvement")).toBeInTheDocument();
  });
});
