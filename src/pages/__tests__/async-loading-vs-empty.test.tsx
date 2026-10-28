// @vitest-environment jsdom
/**
 * R52.e / R52.f — même famille que R52.b/c/d, sur deux écrans dont la lecture
 * est **asynchrone hors hooks** (`reportDefinitionRepo.list()`, `Promise.all`
 * de `CentralAdmin`) :
 *
 *  - `/reports/builder` annonçait « Aucun rapport sauvegardé » pendant le
 *    chargement (l'utilisateur croit avoir perdu ses rapports) ;
 *  - `/admin/organizations/:id` annonçait « aucun admin » / « aucun candidat »
 *    avant la fin de la lecture.
 *
 * Le test échoue sans le correctif (le squelette n'était pas rendu).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Un `Promise` qui ne se résout jamais : c'est la fenêtre de chargement.
const pending = () => new Promise(() => undefined);

vi.mock("@/lib/formSystem", () => ({
  reportDefinitionRepo: {
    list: vi.fn(() => pending()),
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/dataLayer", () => ({
  useOrganizations: () => ({
    data: [{ id: "org-1", name: "Lumina", status: "ACTIVE", type: "Église" }],
    isLoading: false,
  }),
  useCurrentUser: () => ({ id: "u-1", role: "CENTRAL_ADMIN" }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: true, canAccess: true, loading: false, source: "test" }),
}));

vi.mock("@/capabilities/centralAdmin", () => ({
  getRecentActivity: vi.fn(() => pending()),
  getOrgReportCard: vi.fn(() => pending()),
  getOrgAdminDetails: vi.fn(() => pending()),
  listAdminCandidates: vi.fn(() => pending()),
  assignOrgAdmin: vi.fn(async () => undefined),
  revokeOrgAdmin: vi.fn(async () => undefined),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  hasResolvedOrganization: () => true,
}));

vi.mock("@/lib/organization-context", () => ({
  useOrganizationContext: () => ({ mode: "ORG", orgId: "org-1", label: "Lumina" }),
  useMyOrgs: () => ({ data: [], refetch: vi.fn() }),
  enterOrganization: vi.fn(async () => ({ mode: "ORG", orgId: "org-1", label: "Lumina" })),
  exitToCentral: vi.fn(),
  resolveCurrentUserId: () => "u-1",
}));

import ReportBuilder from "@/pages/ReportBuilder";
import CentralAdmin from "@/pages/CentralAdmin";

afterEach(cleanup);

describe("R52.e — /reports/builder", () => {
  it("affiche un squelette (pas « Aucun rapport sauvegardé ») pendant la lecture", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/reports/builder"]}>
        <Routes>
          <Route path="/reports/builder" element={<ReportBuilder />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun rapport sauvegardé")).toBeNull();
  });
});

describe("R52.f — /admin/organizations/:id", () => {
  it("affiche un squelette (pas « aucun admin ») pendant la lecture", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/organizations/org-1"]}>
        <Routes>
          <Route path="/admin/organizations/:id" element={<CentralAdmin />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Les admins actifs de cette organisation apparaîtront ici"),
    ).toBeNull();
  });
});
