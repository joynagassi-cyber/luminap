// @vitest-environment jsdom
/**
 * A7 — `/archives` : la recherche est un `IonSearchbar`.
 *
 * Ce test vérifie le comportement, pas la présence du composant : taper dans
 * la barre doit réellement filtrer la liste. Une barre de recherche affichée
 * mais inerte est une régression silencieuse — l'utilisateur voit tous les
 * éléments et croit avoir filtré.
 *
 * NON-VACUITÉ : retirer le `onIonInput` du `IonSearchbar` fait échouer le test
 * de filtrage (la liste reste complète).
 */
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

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
  purgeEntity: vi.fn(async () => undefined),
  purgeAllArchived: vi.fn(async () => ({ purged: 0, byType: {} })),
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: false, loading: false, source: "both" }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({ default: () => <div /> }));

import Archives from "@/pages/Archives";

async function renderArchives() {
  render(
    <MemoryRouter>
      <Archives />
    </MemoryRouter>,
  );
  // Attendre le chargement réel des trois entités archivées.
  await waitFor(() => expect(screen.getByText("Chorale")).toBeInTheDocument());
}

describe("A7 — /archives : recherche", () => {
  it("affiche une barre de recherche native", async () => {
    await renderArchives();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("taper un terme filtre RÉELLEMENT la liste", async () => {
    await renderArchives();
    expect(screen.getByText("Concert annulé")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "chorale" },
    });

    // Seul l'élément correspondant reste affiché.
    await waitFor(() => expect(screen.queryByText("Concert annulé")).toBeNull());
    expect(screen.getByText("Chorale")).toBeInTheDocument();
  });
});
