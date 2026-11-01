// @vitest-environment jsdom
/**
 * PR11 — Recherche globale : comportement de la page `/search`.
 *
 * Ce que ces tests verrouillent :
 *   1. R52 — tant que la réplique locale n'est pas lue (`isPowerSyncReadyNow()`
 *      faux), la page affiche un SQUELETTE (`aria-busy`) et ne montre JAMAIS
 *      « Aucun résultat » (verdict faux pendant la première synchronisation) ;
 *   2. une requête vide ne renvoie aucun résultat ET ne tombe PAS dans la
 *      branche « pas encore prêt » (état neutre : « Saisissez un mot… ») ;
 *   3. une requête qui correspond affiche les résultats et un clic navigue vers
 *      la fiche (`route`) ;
 *   4. une requête sans correspondance (réplique prête) affiche « Aucun résultat ».
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - remplacer la garde `replicaPending` par `false` ⇒ le test « squelette avant
 *     lecture » échoue (« Aucun résultat »/liste apparaît) ;
 *   - retirer le `navigate(result.route)` ⇒ le test de navigation échoue.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateSpy };
});

const state = {
  ready: false,
  members: [] as unknown[],
};

vi.mock("@/lib/dataLayer", () => ({
  useMembers: () => ({ data: state.members, isLoading: false, error: undefined, retry: vi.fn() }),
  useGroups: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useDocuments: () => ({ data: [], isLoading: false }),
  listFormDefinitionsPS: vi.fn(async () => []),
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));

import Search from "@/pages/Search";

afterEach(() => {
  cleanup();
  navigateSpy.mockClear();
});

beforeEach(() => {
  state.ready = false;
  state.members = [];
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/search"]}>
      <Search />
    </MemoryRouter>,
  );
}

describe("PR11 — /search : disponibilité (R52) et états", () => {
  it("affiche un squelette, jamais « Aucun résultat », tant que la réplique n'est pas prête", () => {
    state.ready = false;
    state.members = [{ id: "m1", first_name: "Marie", last_name: "Kouassi" }];
    const { container } = renderPage();

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Aucun résultat")).toBeNull();
  });

  it("une requête vide ne renvoie aucun résultat et ne tombe PAS dans la branche « pas prêt »", () => {
    state.ready = true;
    state.members = [{ id: "m1", first_name: "Marie", last_name: "Kouassi" }];
    const { container } = renderPage();

    // Réplique prête : aucun squelette.
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBe(0);
    // État neutre, ni « Aucun résultat » ni squelette.
    expect(screen.getByText("Saisissez un mot pour lancer la recherche.")).toBeInTheDocument();
    expect(screen.queryByText("Aucun résultat")).toBeNull();
  });

  it("affiche les résultats correspondants (accents repliés)", () => {
    state.ready = true;
    state.members = [{ id: "m1", first_name: "Marie", last_name: "Kouassi" }];
    renderPage();

    fireEvent.change(screen.getByLabelText("Rechercher dans toute l'application"), {
      target: { value: "kouassi" },
    });

    expect(screen.getByText("Marie Kouassi")).toBeInTheDocument();
  });

  it("un clic sur un résultat navigue vers sa fiche", async () => {
    state.ready = true;
    state.members = [{ id: "m1", first_name: "Marie", last_name: "Kouassi" }];
    renderPage();

    fireEvent.change(screen.getByLabelText("Rechercher dans toute l'application"), {
      target: { value: "marie" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Membre — Marie Kouassi/ }));

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith("/membre/m1");
    });
  });

  it("réplique prête + aucune correspondance → « Aucun résultat »", () => {
    state.ready = true;
    state.members = [{ id: "m1", first_name: "Marie", last_name: "Kouassi" }];
    renderPage();

    fireEvent.change(screen.getByLabelText("Rechercher dans toute l'application"), {
      target: { value: "zzzzz" },
    });

    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });
});
