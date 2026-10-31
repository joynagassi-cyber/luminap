// @vitest-environment jsdom
/**
 * PR8 — approbation en deux étapes : test COMPOSANT de l'écran d'approbation.
 *
 * On rend `TransactionDetail` avec un utilisateur qui EST l'auteur de la
 * transaction et vérifie que le bouton « Approuver » est DÉSACTIVÉ et que
 * l'explication FR est affichée quand le réglage est actif. Quand le réglage
 * est inactif, le bouton est actif (comportement historique).
 *
 * NON-VACUITÉ (preuve) : en retirant `|| selfApprovalBlocked` du `disabled`
 * du bouton (ou la règle `canApproveRule`), le test « bouton désactivé »
 * ÉCHOUE (le bouton redevient actif) ; le restaurer le fait repasser.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Réglage maker-checker piloté par le test.
const mcState = { enabled: false, loaded: true };
vi.mock("@/hooks/useMakerChecker", () => ({
  useMakerChecker: () => ({ ...mcState }),
}));

const tx = {
  id: "tx-1",
  orgId: "org-1",
  type: "EXPENSE",
  amount: 100,
  description: "Achat fournitures",
  date: "2026-10-31",
  status: "PENDING",
  createdById: "me",
  approvedById: null,
  approvedAt: null,
  categoryId: null,
  orgUnitId: null,
  eventId: null,
  version: 1,
  createdAt: "2026-10-31T00:00:00.000Z",
  updatedAt: "2026-10-31T00:00:00.000Z",
};

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [tx], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useOrgUnits: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useDocuments: () => ({ data: [], isLoading: false }),
  useCurrentUser: () => ({ id: "me", role: "ADMIN", org: { id: "org-1" } }),
  isPowerSyncReadyNow: () => true,
  subscribePowerSyncReady: () => () => undefined,
  approveTransactionPS: vi.fn(async () => undefined),
  updateTransactionPS: vi.fn(async () => undefined),
  deleteTransactionPS: vi.fn(async () => undefined),
  reverseTransactionPS: vi.fn(async () => undefined),
}));

vi.mock("@/lib/storageService", () => ({
  getDocumentUrl: vi.fn(async () => "https://example.invalid/x"),
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: true, canAccess: true, loading: false, source: "test" }),
}));

vi.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: () => undefined,
}));

vi.mock("@/hooks/useSubmitGuard", () => ({
  useSubmitGuard: () => ({ submitting: false, run: (fn: () => Promise<void>) => fn() }),
}));

vi.mock("@/capabilities/notification", () => ({
  notification: { sendNotification: vi.fn(async () => undefined) },
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

import TransactionDetail from "@/pages/TransactionDetail";

afterEach(cleanup);

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/transaction/tx-1"]}>
      <Routes>
        <Route path="/transaction/:id" element={<TransactionDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PR8 — TransactionDetail : bouton d'approbation maker-checker", () => {
  it("désactive le bouton et affiche l'explication FR quand l'auteur est l'acteur", () => {
    mcState.enabled = true;
    renderDetail();

    const button = screen.getByTestId("approve-button");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("self-approval-notice")).toHaveTextContent(
      "L'auteur ne peut pas approuver sa propre dépense.",
    );
  });

  it("laisse le bouton actif quand le réglage est DÉSACTIVÉ (historique)", () => {
    mcState.enabled = false;
    renderDetail();

    const button = screen.getByTestId("approve-button");
    expect(button).toBeEnabled();
    expect(screen.queryByTestId("self-approval-notice")).toBeNull();
  });
});
