// @vitest-environment jsdom
/**
 * OrgRoles — écran d'administration des accès (contrat RBAC §3.6).
 *
 * On verrouille ici le RENDU et le GATE de la page :
 *   - l'état non-admin affiche « Accès réservé aux administrateurs » ;
 *   - un admin voit la liste des membres et les 14 rôles dans le select ;
 *   - l'état vide est géré ;
 *   - « Enregistrer » appelle bien la couche d'écriture (chantier B).
 *
 * `useMembers` et `orgAdmin` (chantier B) sont mockés : ils peuvent ne pas
 * encore exister dans le worktree (le coordinateur merge A puis B avant C).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hoisted = vi.hoisted(() => ({
  isAdmin: true,
  members: [] as unknown[],
  assignMemberRole: vi.fn(async () => undefined),
  grantCapability: vi.fn(async () => "grant-1"),
  revokeCapability: vi.fn(async () => undefined),
  listMemberCapabilities: vi.fn(async () => []),
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    email: "admin@example.com",
    firstName: "Ada",
    lastName: "Admin",
    role: "PASTEUR_PRINCIPAL",
    org: { id: "org-1", name: "Lumina", type: "Église", accentColor: "#fff" },
  }),
  useMembers: () => ({ data: hoisted.members, isLoading: false, error: undefined }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: hoisted.isAdmin, loading: false, source: "both" }),
}));

vi.mock("@/lib/orgAdmin", () => ({
  assignMemberRole: hoisted.assignMemberRole,
  grantCapability: hoisted.grantCapability,
  revokeCapability: hoisted.revokeCapability,
  listMemberCapabilities: hoisted.listMemberCapabilities,
}));

vi.mock("@/utils/toast", () => ({
  showSuccess: hoisted.showSuccess,
  showError: hoisted.showError,
}));

// Capacités figées : la page ne dépend pas du contenu exact du chantier B.
vi.mock("@/lib/capabilities", () => ({
  CAPABILITIES: [
    {
      id: "finance.manage",
      label: "Gérer les finances",
      description: "Créer et approuver des transactions",
      domain: "finance",
      permissions: ["transaction:create", "transaction:approve"],
    },
    {
      id: "reports.export",
      label: "Exporter les rapports",
      description: "Générer et exporter des rapports",
      domain: "reports",
      permissions: ["report:export"],
    },
  ],
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

import OrgRoles from "@/pages/OrgRoles";

function member(id: string, first: string, last: string, status = "ACTIVE") {
  return {
    id,
    org_id: "org-1",
    first_name: first,
    last_name: last,
    phone: "",
    email: "",
    status,
    joined_at: "",
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    created_at: "",
    updated_at: "",
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/roles"]}>
      <OrgRoles />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.isAdmin = true;
  hoisted.members = [];
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("OrgRoles — gate administrateur", () => {
  it("affiche « Accès réservé aux administrateurs » pour un non-admin", () => {
    hoisted.isAdmin = false;
    hoisted.members = [member("m1", "Alice", "Durand")];

    renderPage();

    expect(screen.getByText(/Accès réservé aux administrateurs/)).toBeInTheDocument();
    // La liste des membres ne doit PAS fuiter pour un non-admin.
    expect(screen.queryByText("Alice Durand")).toBeNull();
  });
});

describe("OrgRoles — liste des membres et rôles", () => {
  it("affiche chaque membre actif de l'organisation", () => {
    hoisted.members = [
      member("m1", "Alice", "Durand"),
      member("m2", "Bob", "Martin"),
    ];

    renderPage();

    expect(screen.getByText("Alice Durand")).toBeInTheDocument();
    expect(screen.getByText("Bob Martin")).toBeInTheDocument();
  });

  it("propose les 14 rôles canon dans le select", () => {
    hoisted.members = [member("m1", "Alice", "Durand")];

    renderPage();

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(1);
    const options = within(selects[0]).getAllByRole("option");
    expect(options).toHaveLength(14);
    const labels = options.map((o) => o.textContent);
    expect(labels).toContain("Pasteur Principal");
    expect(labels).toContain("Membre");
  });

  it("affiche l'état vide quand aucun membre actif", () => {
    hoisted.members = [member("m1", "Alice", "Durand", "ARCHIVED")];

    renderPage();

    expect(screen.getByText("Aucun membre")).toBeInTheDocument();
    expect(screen.queryByText("Alice Durand")).toBeNull();
  });
});

describe("OrgRoles — enregistrement", () => {
  it("« Enregistrer » assigne le rôle du membre sélectionné", async () => {
    hoisted.members = [member("m1", "Alice", "Durand")];

    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Configurer les capacités de Alice Durand/ }),
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "TREASURIER" } });

    // Le bouton est désactivé tant que les grants du membre se chargent.
    const save = screen.getByRole("button", { name: /Enregistrer/ });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => {
      expect(hoisted.assignMemberRole).toHaveBeenCalledWith(
        "m1",
        "org-1",
        "TREASURIER",
      );
    });
    await waitFor(() => {
      expect(hoisted.showSuccess).toHaveBeenCalled();
    });
  });
});
