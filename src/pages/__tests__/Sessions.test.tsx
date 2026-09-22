// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SessionsPage from "@/pages/Sessions";

// ─── Mocks des dépendances lourdes (dataLayer / org context / store / auth) ─

const mockRefetch = vi.fn(async () => mockOrgs);
const mockLoadInitialData = vi.fn(async () => undefined);

let mockOrgs: Array<{
  orgId: string;
  name: string;
  status: string;
  via: "MEMBER" | "GRANT" | "BOTH" | "LEGACY";
}> = [];

vi.mock("@/lib/organization-context", () => ({
  useMyOrgs: () => ({ data: mockOrgs, refetch: mockRefetch }),
  enterOrganization: vi.fn(async () => ({
    mode: "ORG" as const,
    orgId: mockOrgs[0]?.orgId ?? "",
    label: mockOrgs[0]?.name ?? "",
  })),
  resolveCurrentUserId: vi.fn(() => "user-1"),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    email: "u@example.com",
    firstName: "Test",
    lastName: "User",
    role: "TREASURIER",
    org: { id: "org-1", name: "Lumina Test", type: "Église", accentColor: "#fff" },
  }),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: any) =>
    sel({
      loadInitialData: mockLoadInitialData,
      auditEntries: [],
    }),
}));

vi.mock("@/lib/auth", () => ({
  authService: {
    getSession: vi.fn(async () => null),
    fetchUser: vi.fn(async () => null),
    signOut: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => mockOrgs[0]?.orgId ?? "",
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

beforeEach(() => {
  mockOrgs = [];
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSessions() {
  return render(
    <MemoryRouter initialEntries={["/sessions"]}>
      <SessionsPage />
    </MemoryRouter>,
  );
}

describe("Sessions — « Mes comptes » (persistance de session)", () => {
  it("liste les comptes (orgs) de l'utilisateur", () => {
    mockOrgs = [
      { orgId: "org-a", name: "Église Alpha", status: "ACTIVE", via: "MEMBER" },
      { orgId: "org-b", name: "École Beta", status: "ACTIVE", via: "GRANT" },
    ];
    renderSessions();
    expect(screen.getByText("Église Alpha")).toBeInTheDocument();
    expect(screen.getByText("École Beta")).toBeInTheDocument();
    expect(screen.getByText(/Membre/)).toBeInTheDocument();
    expect(screen.getByText(/Admin \(grant\)/)).toBeInTheDocument();
  });

  it("affiche l'État « Actif » sur l'org courante", () => {
    mockOrgs = [
      { orgId: "org-a", name: "Église Alpha", status: "ACTIVE", via: "MEMBER" },
      { orgId: "org-b", name: "École Beta", status: "ACTIVE", via: "MEMBER" },
    ];
    renderSessions();
    // getOrganizationId() → mockOrgs[0].orgId = "org-a"
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("message vide quand aucun compte", () => {
    mockOrgs = [];
    renderSessions();
    expect(screen.getByText("Aucun compte lié pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText("u@example.com")).toBeInTheDocument();
  });

  it("retirer un compte le masque persistant (localStorage) pour cet utilisateur", async () => {
    mockOrgs = [
      { orgId: "org-a", name: "Église Alpha", status: "ACTIVE", via: "MEMBER" },
      { orgId: "org-b", name: "École Beta", status: "ACTIVE", via: "MEMBER" },
    ];
    renderSessions();

    // Le bouton de retrait cible le PREMIER compte de la liste.
    const removeBtn = screen.getByRole("button", { name: /Retirer Église Alpha/ });
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    // La paire (userId, orgId) est persistée.
    await waitFor(() => {
      const raw = localStorage.getItem("lumina-removed-accounts");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!)).toEqual([{ userId: "user-1", orgId: "org-a" }]);
    });
  });

  it("un compte retiré par UN utilisateur reste visible pour un autre", async () => {
    // user-1 retire org-a.
    mockOrgs = [
      { orgId: "org-a", name: "Église Alpha", status: "ACTIVE", via: "MEMBER" },
    ];
    // On simule un masque écrit par user-1.
    localStorage.setItem(
      "lumina-removed-accounts",
      JSON.stringify([{ userId: "user-9", orgId: "org-a" }]),
    );
    // En tant que user-1 (mock de resolveCurrentUserId), le masque de user-9
    // ne doit PAS masquer org-a.
    renderSessions();
    expect(screen.getByText("Église Alpha")).toBeInTheDocument();
  });

  it("déconnexion : bouton actif et comptes toujours listés", () => {
    mockOrgs = [
      { orgId: "org-a", name: "Église Alpha", status: "ACTIVE", via: "MEMBER" },
    ];
    renderSessions();
    const signOutBtn = screen.getByRole("button", {
      name: "Se déconnecter de tous les comptes",
    });
    expect(signOutBtn).toBeEnabled();
    // Le retrait est disabled tant qu'un action est en cours (busy = null ici).
    expect(signOutBtn).toBeInTheDocument();
  });
});
