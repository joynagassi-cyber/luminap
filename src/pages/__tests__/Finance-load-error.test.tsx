// @vitest-environment jsdom
/**
 * Finance — un échec de chargement ne doit PAS ressembler à « aucune donnée »
 * (R88).
 *
 * Défaut corrigé : `.catch(() => setLoading(false))` affichait la liste vide
 * standard (« Aucune transaction trouvée ») sur toute erreur (SQL, réseau,
 * RLS) et n'en laissait aucune trace — c'est ce qui a rendu R87 invisible.
 *
 * Ces tests verrouillent les deux moitiés du correctif :
 *  - l'erreur est CAPTURÉE (captureClientError) ;
 *  - l'utilisateur voit un état d'erreur explicite avec un bouton « Réessayer »
 *    (et non l'état vide), et le bouton relance le chargement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const list = vi.fn();
const captureClientError = vi.fn();

vi.mock("@/capabilities/resource", () => ({
  resource: { list: (...a: unknown[]) => list(...a) },
}));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: (...a: unknown[]) => captureClientError(...a),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCategories: () => ({ data: [] }),
  useAccounts: () => ({ data: [] }),
  useCaisses: () => ({ data: [] }),
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
  captureClientError.mockReset();
});
afterEach(() => cleanup());

describe("Finance — échec de chargement (R88)", () => {
  it("capture l'erreur et affiche un état d'erreur, pas l'état vide", async () => {
    list.mockRejectedValue(new Error("permission denied for table transactions"));

    render(<MemoryRouter><Finance /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText("Chargement impossible")).toBeInTheDocument(),
    );
    expect(captureClientError).toHaveBeenCalledTimes(1);
    // L'état vide « aucune transaction » ne doit PAS être affiché sur erreur.
    expect(screen.queryByText("Aucune transaction trouvée")).not.toBeInTheDocument();
  });

  it("« Réessayer » relance le chargement et affiche les données au succès", async () => {
    list.mockRejectedValueOnce(new Error("réseau"));
    render(<MemoryRouter><Finance /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText("Chargement impossible")).toBeInTheDocument(),
    );

    list.mockResolvedValueOnce({ items: [] });
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    // Après réessai réussi : plus d'erreur, et l'état vide légitime revient.
    await waitFor(() =>
      expect(screen.queryByText("Chargement impossible")).not.toBeInTheDocument(),
    );
    expect(list).toHaveBeenCalledTimes(2);
  });
});
