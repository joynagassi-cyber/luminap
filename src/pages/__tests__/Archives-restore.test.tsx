// @vitest-environment jsdom
/**
 * PR3 — « Corbeille / restauration (soft-delete) » : câblage UI de la page
 * `/archives`.
 *
 * Le cœur de la restauration (`lifecycle.restore`) est déjà couvert par
 * `src/capabilities/__tests__/lifecycle.test.ts`. Ce test verrouille le
 * **câblage de la page** (contrat : toute feature livrée a ses tests) :
 *   1. les entités archivées (groupe, membre) sont listées ;
 *   2. cliquer « Restaurer X » appelle réellement `lifecycle.restore` avec le
 *      bon type d'entité et le bon id — pas un bouton inerte ;
 *   3. le filtre par type masque les entités des autres types.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : remplacer le corps de
 * `handleRestore` par `() => undefined` ⇒ le test « restaure » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const restore = vi.fn(async (..._args: unknown[]) => undefined);
const navigate = vi.fn();

const archived = {
  Group: [{ id: "g1", name: "Chorale", archive_reason: "Fusion" }],
  Member: [{ id: "m1", first_name: "Anne", last_name: "Dupont" }],
  Event: [{ id: "e1", name: "Concert annulé" }],
};

// État mutable du chargement des documents (R52) : `documentsPending` doit
// empêcher le verdict « Aucun document archivé » tant que la lecture n'a pas
// abouti. Piloté par les tests R52 ci-dessous.
const docsState = { loading: false, ready: true, documents: [] as unknown[] };

vi.mock("@/capabilities/lifecycle", () => ({
  lifecycle: { restore: (...args: unknown[]) => restore(...args) },
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
  useDocuments: () => ({
    data: docsState.documents,
    isLoading: docsState.loading,
  }),
  isPowerSyncReadyNow: () => docsState.ready,
  addDocumentPS: vi.fn(),
  updateDocumentPS: vi.fn(),
}));

vi.mock("@/lib/storageService", () => ({
  uploadLuminaFile: vi.fn(),
  getDocumentUrl: vi.fn(),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div />,
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: (s: unknown) => unknown) =>
    sel({ notifications: [], markAllNotificationsRead: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigate };
});

import Archives from "@/pages/Archives";

beforeEach(() => {
  restore.mockClear();
  navigate.mockClear();
  docsState.loading = false;
  docsState.ready = true;
  docsState.documents = [];
});
afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter>
      <Archives />
    </MemoryRouter>,
  );
}

describe("PR3 — page /archives (corbeille)", () => {
  it("liste les entités archivées (groupes + membres)", async () => {
    renderPage();
    expect(await screen.findByText("Chorale")).toBeInTheDocument();
    expect(await screen.findByText("Anne Dupont")).toBeInTheDocument();
  });

  it("« Restaurer » appelle lifecycle.restore avec le bon type et id", async () => {
    renderPage();
    const btn = await screen.findByRole("button", {
      name: "Restaurer Chorale",
    });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(restore).toHaveBeenCalledWith("Group", "g1", "", "local-user"),
    );
  });

  it("le filtre « Membres » masque les groupes", async () => {
    renderPage();
    await screen.findByText("Chorale");
    fireEvent.click(screen.getByRole("button", { name: "Filtrer par Membres" }));
    expect(screen.queryByText("Chorale")).not.toBeInTheDocument();
    expect(screen.getByText("Anne Dupont")).toBeInTheDocument();
  });
});

/**
 * R52 — « Aucun document archivé » n'est exact qu'une fois la lecture terminée.
 * `useDocuments()` renvoie `isLoading: true` (et la réplique n'est pas prête)
 * tant que PowerSync n'a pas répondu : afficher le verdict vide pendant ce
 * temps fait croire à une perte de documents.
 */
describe("R52 — /archives : verdict vide des documents seulement après lecture", () => {
  it("n'annonce pas « Aucun document archivé » pendant la lecture", async () => {
    docsState.loading = true;
    docsState.ready = false;
    docsState.documents = [];
    renderPage();
    await screen.findByText("Chorale");
    fireEvent.click(screen.getByRole("button", { name: "Filtrer par Documents" }));
    expect(screen.queryByText("Aucun document archivé")).not.toBeInTheDocument();
    expect(screen.getByText("Chargement des documents…")).toBeInTheDocument();
  });

  it("annonce le vide une fois la lecture terminée (réellement aucun document)", async () => {
    docsState.loading = false;
    docsState.ready = true;
    docsState.documents = [];
    renderPage();
    await screen.findByText("Chorale");
    fireEvent.click(screen.getByRole("button", { name: "Filtrer par Documents" }));
    expect(await screen.findByText("Aucun document archivé")).toBeInTheDocument();
  });
});
