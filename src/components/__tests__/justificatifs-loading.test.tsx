// @vitest-environment jsdom
/**
 * PR9 — `JustificatifsSection` : « pas encore lu » ≠ « aucun justificatif ».
 *
 * NON-VACUITÉ (vérifiée) : retirer la branche `isLoading ? <ListSkeleton/> : …`
 * et rendre directement le verdict vide fait réapparaître « Aucun justificatif
 * joint pour le moment. » pendant la lecture → le premier test échoue.
 *
 * Cas mesuré : la réplique PowerSync n'a pas encore répondu (`useReceipts`
 * renvoie `isLoading: true`). Afficher « aucun justificatif » ferait croire à
 * l'utilisateur que ses reçus ont disparu.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";

const state = {
  loading: true,
  receipts: [] as any[],
};

vi.mock("@/lib/receipts", () => ({
  useReceipts: () => ({ data: state.receipts, isLoading: state.loading }),
  addReceipt: vi.fn(async () => "r-1"),
  removeReceipt: vi.fn(async () => undefined),
  validateReceiptFile: () => ({ ok: true }),
  receiptError: () => "",
  RECEIPT_ALLOWED_MIME: ["image/jpeg", "application/pdf"],
}));

vi.mock("@/lib/storageService", () => ({
  getDocumentUrl: vi.fn(async () => "https://example.test/signed"),
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

import JustificatifsSection from "@/components/JustificatifsSection";

afterEach(cleanup);

describe("PR9 — JustificatifsSection : lecture en cours", () => {
  it("n'annonce pas « Aucun justificatif » avant la première lecture", () => {
    state.loading = true;
    state.receipts = [];
    const { container } = render(<JustificatifsSection transactionId="tx-1" />);

    expect(
      screen.queryByText("Aucun justificatif joint pour le moment."),
    ).toBeNull();
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("annonce le vide quand la lecture est terminée (réellement aucun reçu)", () => {
    state.loading = false;
    state.receipts = [];
    const { container } = render(<JustificatifsSection transactionId="tx-1" />);

    expect(
      screen.getByText("Aucun justificatif joint pour le moment."),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
  });

  it("liste les justificatifs lus (avec bouton de suppression)", () => {
    state.loading = false;
    state.receipts = [
      {
        id: "r-1",
        org_id: "org-1",
        transaction_id: "tx-1",
        path: "org-1/tx/tx-1/recu.jpg",
        mime: "image/jpeg",
        size: 4096,
        uploaded_by: null,
        created_at: "2026-10-31T00:00:00.000Z",
      },
    ];
    render(<JustificatifsSection transactionId="tx-1" />);

    expect(screen.getByLabelText("Supprimer le justificatif")).toBeInTheDocument();
    expect(
      screen.queryByText("Aucun justificatif joint pour le moment."),
    ).toBeNull();
  });
});
