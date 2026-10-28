// @vitest-environment jsdom
/**
 * R52.p — `DocumentPicker` annonçait « Aucun document uploadé pour le moment. »
 * alors que la liste des documents était encore en cours de lecture.
 *
 * Cas mesuré : `useDocuments()` renvoie `isLoading: true` (la réplique PowerSync
 * n'a pas encore répondu). L'utilisateur croyait avoir perdu ses pièces jointes.
 *
 * Le test échoue sans la garde `documentsPending` (remettre le ternaire d'origine
 * fait réapparaître le verdict faux).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

const state = { loading: true, ready: false, documents: [] as any[] };

vi.mock("@/lib/dataLayer", () => ({
  useDocuments: () => ({ data: state.documents, isLoading: state.loading, source: "powersync" }),
  addDocumentPS: vi.fn(async () => undefined),
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/lib/storageService", () => ({ uploadLuminaFile: vi.fn(async () => "path") }));

import DocumentPicker from "@/components/DocumentPicker";

afterEach(cleanup);

describe("R52.p — DocumentPicker : lecture des documents en cours", () => {
  it("n'annonce pas « Aucun document uploadé » pendant la lecture", () => {
    state.loading = true;
    state.ready = false;
    state.documents = [];
    render(<DocumentPicker selectedIds={[]} onChange={() => {}} />);

    expect(screen.queryByText("Aucun document uploadé pour le moment.")).toBeNull();
    expect(screen.getByText("Chargement des documents…")).toBeInTheDocument();
  });

  it("annonce le vide quand la lecture est terminée (réellement aucun document)", () => {
    state.loading = false;
    state.ready = true;
    state.documents = [];
    render(<DocumentPicker selectedIds={[]} onChange={() => {}} />);

    expect(screen.getByText("Aucun document uploadé pour le moment.")).toBeInTheDocument();
  });
});
