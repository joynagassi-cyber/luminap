// @vitest-environment jsdom
/**
 * Finance — à date égale, la transaction la plus récemment créée doit
 * apparaître en tête de son groupe (R85).
 *
 * Défaut corrigé : le tri de `filteredTransactions` ne portait que sur
 * `date`. À date égale, le tri (stable) conservait l'ordre de balayage
 * SQLite, où une ligne saisie à l'instant — insérée APRÈS les lignes
 * synchronisées — ferme le groupe du jour. Dès qu'un jour compte plus
 * de FINANCE_PAGE_SIZE (50) transactions, la saisie fraîche sort de la
 * première fenêtre affichée : invisible pour l'utilisateur, et échec
 * déterministe de la spec E2E `offline-write-sync.cy.ts` (étape 3b),
 * l'organisation de test accumulant 280 transactions datées du jour.
 *
 * Non-vacuité : retirer le départage `createdAt` du comparateur →
 * « Saisie à l'instant » (dernière du tableau fourni, comme une ligne
 * fraîche en fin de balayage) retombe au rang 60, hors fenêtre, et
 * disparaît du DOM — ce test échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const list = vi.fn();

vi.mock("@/capabilities/resource", () => ({
  resource: { list: (...a: unknown[]) => list(...a) },
}));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: vi.fn(),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCategories: () => ({ data: [] }),
  useAccounts: () => ({ data: [] }),
  useCaisses: () => ({ data: [] }),
  // Révision d'org figée : le chargement initial suffit pour ce test.
  useOrganizationRevision: () => 0,
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));

vi.mock("@/components/CapabilityBanner", () => ({ default: () => null }));
vi.mock("@/components/TopHeader", () => ({ default: () => null }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

import Finance from "@/pages/Finance";

beforeEach(() => {
  list.mockReset();
});
afterEach(() => cleanup());

describe("Finance — ordre intra-jour (R85)", () => {
  it("une saisie du jour apparaît dans la première fenêtre même au-delà de 50 transactions le même jour", async () => {
    // Ordre « balayage SQLite » : les lignes synchronisées d'abord
    // (createdAt croissant), la ligne saisie à l'instant EN DERNIER.
    const items: Record<string, unknown>[] = Array.from({ length: 59 }, (_, i) => ({
      id: `tx-old-${i}`,
      type: "INCOME",
      amount: 1000,
      description: `Ancienne ${String(i).padStart(2, "0")}`,
      date: "2026-11-03",
      status: "APPROVED",
      createdAt: `2026-11-03T08:${String(i).padStart(2, "0")}:00.000Z`,
      sourceCaisseId: "main",
    }));
    items.push({
      id: "tx-fresh",
      type: "INCOME",
      amount: 1234500,
      description: "Saisie à l'instant",
      date: "2026-11-03",
      status: "APPROVED",
      createdAt: "2026-11-03T23:59:59.000Z",
      sourceCaisseId: "main",
    });
    list.mockResolvedValue({ items });

    render(
      <MemoryRouter>
        <Finance />
      </MemoryRouter>,
    );

    // La plus récemment créée est en tête du groupe du jour : visible
    // sans « voir plus ».
    expect(await screen.findByText("Saisie à l'instant")).toBeInTheDocument();
    // La fenêtre de 50 est bien appliquée : la plus ancienne du jour
    // (rang 60 après départage) n'est pas rendue.
    expect(screen.queryByText("Ancienne 00")).not.toBeInTheDocument();
  });
});
