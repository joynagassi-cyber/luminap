// @vitest-environment jsdom
/**
 * R52.b — « une liste en cours de lecture n'est pas une liste vide ».
 *
 * Défaut (famille R52, rechute sur `/giving`) : les hooks
 * `useGivingCampaigns` / `useGivingDonors` / `usePledges` / `useTaxReceipts`
 * renvoient `data: []` ET `isLoading: true` tant que la première lecture
 * PowerSync n'a pas abouti. La page ne lisait que `data` et affichait donc
 * `EmptyState` (« Aucune campagne ») pendant le chargement — un message FAUX,
 * affiché précisément quand l'utilisateur vérifie que ses données existent.
 *
 * Ce test échoue sans le correctif (non-vacuité vérifiée : en retirant le
 * branchement `isLoading`, l'assertion « squelette » échoue).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Les 4 hooks de la page : vides, et l'état de lecture est pilotable pour
// distinguer « en cours » (squelette) de « vraiment vide » (EmptyState).
const state = { loading: true };

vi.mock("@/lib/dataLayer", () => ({
  useGivingCampaigns: () => ({ data: [], isLoading: state.loading }),
  useGivingDonors: () => ({ data: [], isLoading: state.loading }),
  usePledges: () => ({ data: [], isLoading: state.loading }),
  useTaxReceipts: () => ({ data: [], isLoading: state.loading }),
  useTransactions: () => ({ data: [], isLoading: state.loading }),
  useTransactionGiving: () => ({ data: [], isLoading: state.loading }),
  addGivingDonorPS: vi.fn(async () => undefined),
  addGivingCampaignPS: vi.fn(async () => undefined),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

import Giving from "@/pages/Giving";

afterEach(cleanup);

describe("R52.b — /giving : état de chargement ≠ état vide", () => {
  it("affiche un squelette (aria-busy) et AUCUN message « vide » pendant la lecture", () => {
    state.loading = true;
    const { container } = render(
      <MemoryRouter>
        <Giving />
      </MemoryRouter>,
    );

    // L'état de chargement est annoncé (squelette de liste).
    const busy = container.querySelectorAll('[aria-busy="true"]');
    expect(busy.length).toBeGreaterThan(0);

    // Et AUCUN état vide faux n'est rendu, sur les 4 onglets.
    expect(screen.queryByText("Aucune campagne")).toBeNull();
    expect(screen.queryByText("Aucun donateur")).toBeNull();
  });

  it("affiche l'état vide SEULEMENT quand la lecture est terminée (liste vraiment vide)", () => {
    state.loading = false;
    const { container } = render(
      <MemoryRouter>
        <Giving />
      </MemoryRouter>,
    );

    // Plus de squelette, et le message vide (cette fois exact) apparaît.
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    expect(screen.getByText("Aucune campagne")).toBeInTheDocument();
  });
});
