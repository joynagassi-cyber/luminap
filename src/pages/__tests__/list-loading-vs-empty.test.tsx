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
  updateCotisationPS: vi.fn(async () => undefined),
  useGroups: () => ({ data: [], isLoading: false }),
  useGroupMemberships: () => ({ data: [], isLoading: false }),
  parseBudgetItems: () => [],
  updateTransactionPS: vi.fn(async () => undefined),
  deleteTransactionPS: vi.fn(async () => undefined),
  useDocuments: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useAuditEntries: () => ({ data: [], isLoading: false }),
  useNotifications: () => ({ data: [], isLoading: false, error: undefined, retry: vi.fn() }),
  useAppConfig: () => ({ config: { churchName: "Lumina", churchLogoUrl: "" }, updateConfig: vi.fn() }),
  useAccounts: () => ({ data: [], isLoading: false }),
  addMemberPS: vi.fn(async () => undefined),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  createGroupPS: vi.fn(async () => undefined),
  updateGroupPS: vi.fn(async () => undefined),
  deleteGroupPS: vi.fn(async () => undefined),
  // PR10 — la bannière de rappel lit le dernier rapport envoyé ; le mock la
  // laisse « non lu » pour ne pas changer les assertions de cette suite.
  useLastSentReport: () => ({ lastSentAt: null, loaded: false }),
}));

vi.mock("@/capabilities/policy", () => ({
  policy: { can: () => true, assert: () => true },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  hasResolvedOrganization: () => true,
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

import MembreDetail from "@/pages/MembreDetail";
import MembresEnAvance from "@/pages/MembresEnAvance";
import Budgets from "@/pages/Budgets";
import BudgetDetail from "@/pages/BudgetDetail";
import GivingCampaign from "@/pages/GivingCampaign";
import OrgRoles from "@/pages/OrgRoles";
import CulteDetail from "@/pages/CulteDetail";
import GroupCotisation from "@/pages/GroupCotisation";
import TransactionDetail from "@/pages/TransactionDetail";
import SaisieRapide from "@/pages/SaisieRapide";
import Trace from "@/pages/Trace";
import OrgReportSend from "@/pages/OrgReportSend";
import Members from "@/pages/Members";
import Events from "@/pages/Events";
import Groups from "@/pages/Groups";
import Cotisations from "@/pages/Cotisations";
import Notifications from "@/pages/Notifications";
import GroupDetail from "@/pages/GroupDetail";
import Reports from "@/pages/Reports";

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

describe("R52.h — autres pages de détail : « introuvable » avant le premier sync", () => {
  it("/cultes/:id affiche un squelette, pas « Culte introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/cultes/e-1"]}>
        <Routes>
          <Route path="/cultes/:id" element={<CulteDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Culte introuvable")).toBeNull();
  });

  it("/groups/:id/cotisation affiche un squelette, pas « Groupe introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/groups/g-1/cotisation"]}>
        <Routes>
          <Route path="/groups/:id/cotisation" element={<GroupCotisation />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Groupe introuvable.")).toBeNull();
  });

  it("/transaction/:id affiche un squelette, pas « Transaction introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/transaction/t-1"]}>
        <Routes>
          <Route path="/transaction/:id" element={<TransactionDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Transaction introuvable")).toBeNull();
  });
});

describe("R52.i — /saisie-rapide/:id : « Culte introuvable » avant le premier sync", () => {
  it("affiche un squelette, pas « Culte introuvable. »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/saisie-rapide/e-1"]}>
        <Routes>
          <Route path="/saisie-rapide/:id" element={<SaisieRapide />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Culte introuvable.")).toBeNull();
  });
});

describe("R52.j — /trace et /admin/reports/send : « aucun » avant la première lecture", () => {
  it("/trace affiche un squelette, pas « Aucune entrée trouvée »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/trace"]}>
        <Routes>
          <Route path="/trace" element={<Trace />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucune entrée trouvée")).toBeNull();
  });

  it("/admin/reports/send affiche un squelette, pas « Aucun rapport envoyé »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/reports/send"]}>
        <Routes>
          <Route path="/admin/reports/send" element={<OrgReportSend />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun rapport envoyé pour le moment.")).toBeNull();
  });
});

describe("R52.m — listes principales : verdict vide avant la première lecture", () => {
  it("/members affiche un squelette, pas « Aucun membre »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Members />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun membre")).toBeNull();
  });

  it("/events affiche un squelette, pas « Aucun événement »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Events />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun événement")).toBeNull();
  });

  it("/groups affiche un squelette, pas « Aucun groupe »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Groups />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun groupe")).toBeNull();
  });

  it("/cotisations affiche un squelette, pas « Aucun culte »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Cotisations />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun culte")).toBeNull();
  });

  it("/notifications affiche un squelette, pas « Pas encore de notification »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Pas encore de notification")).toBeNull();
  });
});

describe("R52.n — /group/:id : « Groupe introuvable » avant le premier sync", () => {
  it("affiche un squelette, pas « Groupe introuvable »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/group/g-1"]}>
        <Routes>
          <Route path="/group/:id" element={<GroupDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Groupe introuvable")).toBeNull();
  });
});

describe("R52.o — /reports : « Aucun rapport personnalisé » avant la lecture", () => {
  it("affiche un squelette, pas « Aucun rapport personnalisé »", () => {
    state.ready = false;
    const { container } = render(
      <MemoryRouter initialEntries={["/reports"]}>
        <Routes>
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun rapport personnalisé")).toBeNull();
  });
});
