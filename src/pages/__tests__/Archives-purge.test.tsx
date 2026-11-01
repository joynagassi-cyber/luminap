// @vitest-environment jsdom
/**
 * PR3 (complément) — purge définitive : câblage UI de la page `/archives`.
 *
 * Le cœur de la purge (`purgeEntity` / `purgeAllArchived`) est couvert par
 * `src/lib/__tests__/trash-purge.test.ts`. Ce test verrouille le CONTRAT de
 * l'écran :
 *   1. les actions de purge (ligne + « Vider la corbeille ») n'apparaissent
 *      QUE pour les rôles autorisés (admin) ;
 *   2. la confirmation explicite est EXIGÉE : cliquer l'action n'appelle pas
 *      la purge tant que le dialogue n'est pas confirmé ;
 *   3. annuler le dialogue n'appelle JAMAIS la purge ;
 *   4. confirmer appelle bien `purgeEntity` / `purgeAllArchived`.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : retirer le garde
 * `canPurge &&` autour du bouton de ligne fait ÉCHOUER le test « un non-admin
 * ne voit aucune action de purge ».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hoisted = vi.hoisted(() => ({
  canPurge: true,
  purgeEntity: vi.fn<(entityType: string, id: string, actor: string) => Promise<void>>(
    async () => undefined,
  ),
  purgeAllArchived: vi.fn<(actor: string) => Promise<{ purged: number; byType: object }>>(
    async () => ({ purged: 0, byType: {} }),
  ),
}));

const archived = {
  Group: [{ id: "g1", name: "Chorale", archive_reason: "Fusion" }],
  Member: [{ id: "m1", first_name: "Anne", last_name: "Dupont" }],
  Event: [{ id: "e1", name: "Concert annulé" }],
};

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("@/capabilities/lifecycle", () => ({
  lifecycle: { restore: vi.fn(async () => undefined) },
}));

vi.mock("@/capabilities/resource", () => ({
  resource: {
    listArchived: vi.fn(async (type: keyof typeof archived) => ({
      items: archived[type] ?? [],
      total: (archived[type] ?? []).length,
    })),
  },
}));

vi.mock("@/lib/dataLayer", () => ({
  useDocuments: () => ({ data: [], isLoading: false }),
  isPowerSyncReadyNow: () => true,
  addDocumentPS: vi.fn(),
  updateDocumentPS: vi.fn(),
  useCurrentUser: () => ({
    id: "user-1",
    email: "admin@example.com",
    firstName: "Ada",
    lastName: "Admin",
    role: "ADMIN",
    org: { id: "org-1", name: "Lumina", type: "Église", accentColor: "#fff" },
  }),
}));

vi.mock("@/lib/storageService", () => ({
  uploadLuminaFile: vi.fn(),
  getDocumentUrl: vi.fn(),
}));

vi.mock("@/lib/trash", () => ({
  purgeEntity: (entityType: string, id: string, actor: string) =>
    hoisted.purgeEntity(entityType, id, actor),
  purgeAllArchived: (actor: string) => hoisted.purgeAllArchived(actor),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({
    allowed: hoisted.canPurge,
    loading: false,
    source: "both",
  }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div />,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => vi.fn() };
});

import Archives from "@/pages/Archives";

beforeEach(() => {
  hoisted.canPurge = true;
  hoisted.purgeEntity.mockClear();
  hoisted.purgeAllArchived.mockClear();
});
afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter>
      <Archives />
    </MemoryRouter>,
  );
}

describe("PR3 — purge définitive (/archives)", () => {
  it("affiche les actions de purge pour un admin", async () => {
    renderPage();
    expect(
      await screen.findByRole("button", {
        name: "Supprimer définitivement Chorale",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vider la corbeille" }),
    ).toBeInTheDocument();
  });

  it("masque les actions de purge pour un rôle non autorisé", async () => {
    hoisted.canPurge = false;
    renderPage();
    await screen.findByText("Chorale");
    expect(
      screen.queryByRole("button", { name: "Supprimer définitivement Chorale" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vider la corbeille" }),
    ).not.toBeInTheDocument();
  });

  it("exige la confirmation avant d'appeler purgeEntity", async () => {
    renderPage();
    const rowBtn = await screen.findByRole("button", {
      name: "Supprimer définitivement Chorale",
    });
    fireEvent.click(rowBtn);

    // La confirmation s'affiche, MAIS la purge n'a pas encore été appelée.
    expect(await screen.findByText("Supprimer définitivement ?")).toBeInTheDocument();
    expect(hoisted.purgeEntity).not.toHaveBeenCalled();

    // Confirmer déclenche la purge avec le bon type / id / acteur.
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer définitivement" }),
    );
    await waitFor(() =>
      expect(hoisted.purgeEntity).toHaveBeenCalledWith("Group", "g1", "user-1"),
    );
  });

  it("annuler la confirmation n'appelle jamais la purge", async () => {
    renderPage();
    const rowBtn = await screen.findByRole("button", {
      name: "Supprimer définitivement Chorale",
    });
    fireEvent.click(rowBtn);
    await screen.findByText("Supprimer définitivement ?");

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(hoisted.purgeEntity).not.toHaveBeenCalled();
  });

  it("« Vider la corbeille » exige une confirmation puis purge en lot", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "Vider la corbeille" }),
    );
    expect(await screen.findByText("Vider la corbeille ?")).toBeInTheDocument();
    expect(hoisted.purgeAllArchived).not.toHaveBeenCalled();

    // Le bouton de confirmation du dialogue porte le même libellé.
    const confirmBtns = screen.getAllByRole("button", {
      name: "Vider la corbeille",
    });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);
    await waitFor(() =>
      expect(hoisted.purgeAllArchived).toHaveBeenCalledWith("user-1"),
    );
  });
});
