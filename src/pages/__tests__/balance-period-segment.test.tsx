// @vitest-environment jsdom
/**
 * A7 — le sélecteur de période de `/balance` est un `IonSegment`.
 *
 * Ce test ne vérifie pas « qu'il y a un IonSegment » (ce serait un test de
 * présence, donc vide). Il vérifie le comportement qui compte : choisir
 * « Année » change réellement la période utilisée pour calculer les totaux.
 *
 * NON-VACUITÉ : si le `onIonChange` est retiré (segment décoratif), le test
 * « le choix Année change la période » échoue ; si le `value` est figé, le
 * test d'état sélectionné échoue.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

const mocks = vi.hoisted(() => ({ getPeriodRange: vi.fn() }));

vi.mock("@/lib/dataLayer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dataLayer")>();
  return {
    ...actual,
    useCurrentUser: () => ({ data: null, isLoading: false }),
    useTransactions: () => ({ data: [], isLoading: false }),
    useCategories: () => ({ data: [], isLoading: false }),
    useAccounts: () => ({ data: [], isLoading: false }),
    useCaisses: () => ({ data: [], isLoading: false }),
    useAppConfig: () => ({ config: { churchName: "Lumina" }, updateConfig: vi.fn() }),
    isPowerSyncReadyNow: () => true,
    createVersement: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  hasResolvedOrganization: () => true,
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    // On observe la période réellement demandée au calcul, pas le rendu.
    getPeriodRange: mocks.getPeriodRange,
  };
});

import Balance from "@/pages/Balance";

beforeEach(() => {
  mocks.getPeriodRange.mockReset();
  mocks.getPeriodRange.mockReturnValue({
    start: new Date("2026-11-01"),
    end: new Date("2026-11-30"),
  });
});

describe("A7 — /balance : sélecteur de période", () => {
  it("démarre sur le mois et interroge le calcul avec « mois »", () => {
    render(
      <MemoryRouter>
        <Balance />
      </MemoryRouter>,
    );

    expect(mocks.getPeriodRange).toHaveBeenCalledWith("mois");
    expect(screen.getByRole("button", { name: "Mois" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("choisir « Année » change RÉELLEMENT la période utilisée", () => {
    render(
      <MemoryRouter>
        <Balance />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Année" }));

    // Le calcul est refait avec « annee » : le segment pilote bien l'écran.
    expect(mocks.getPeriodRange).toHaveBeenLastCalledWith("annee");
    expect(screen.getByRole("button", { name: "Année" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Mois" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
