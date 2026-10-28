// @vitest-environment jsdom
/**
 * R52.t — `/transaction/:id/edit` : formulaire VIDE rendu en état `ready`
 * avant la 1re lecture (aucun signal de disponibilité).
 *
 * Même famille que R52.l→R52.s (D-R41). L'utilisateur pouvait croire à une
 * transaction sans montant/description et enregistrer un formulaire vide, ou
 * écraser les vraies valeurs arrivées au sync suivant.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const state = {
  ready: false,
  transactions: [] as Array<Record<string, unknown>>,
};

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: state.transactions }),
  useCategories: () => ({ data: [] }),
  useOrgUnits: () => ({ data: [] }),
  useEvents: () => ({ data: [] }),
  useAccounts: () => ({ data: [] }),
  updateTransactionPS: vi.fn(async () => undefined),
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/capabilities/policy", () => ({
  policy: { transaction: { validateAmount: () => ({ ok: true }) } },
}));
vi.mock("@/hooks/useKeyboardAvoidance", () => ({ useKeyboardAvoidance: () => 0 }));
vi.mock("@/components/TopHeader", () => ({ default: () => null }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@ionic/react", () => {
  const P =
    (tag: string) =>
    ({ children, ...rest }: any) =>
      React.createElement(tag, rest, children);
  return {
    IonPage: P("div"),
    IonHeader: P("div"),
    IonContent: P("div"),
    IonTitle: P("div"),
    IonToolbar: P("div"),
    IonItem: P("div"),
    IonLabel: P("label"),
    IonInput: P("input"),
    IonTextarea: P("textarea"),
    IonSelect: P("select"),
    IonSelectOption: P("option"),
  };
});

import TransactionEdit from "@/pages/TransactionEdit";

afterEach(cleanup);

function renderAt(id = "tx-1") {
  return render(
    <MemoryRouter initialEntries={[`/transaction/${id}/edit`]}>
      <Routes>
        <Route path="/transaction/:id/edit" element={<TransactionEdit />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("R52.t — /transaction/:id/edit", () => {
  it("affiche le squelette (jamais le formulaire vide) avant la 1re lecture", () => {
    state.ready = false;
    state.transactions = [];
    renderAt();
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/)).toBeNull();
  });

  it("annonce « introuvable » avec une action quand la transaction est réellement absente", () => {
    state.ready = true;
    state.transactions = [];
    renderAt("absent");
    expect(screen.getByText("Cette transaction est introuvable.")).toBeInTheDocument();
    expect(screen.getByText("Retour aux transactions")).toBeInTheDocument();
  });

  it("rend le formulaire pré-rempli quand la transaction est lue", () => {
    state.ready = true;
    state.transactions = [
      {
        id: "tx-1",
        type: "EXPENSE",
        amount: 250000,
        description: "Achat de chaises",
        date: "2026-11-02T00:00:00Z",
        status: "PENDING",
        category_id: "cat-1",
      },
    ];
    renderAt("tx-1");
    expect(screen.queryByText("Chargement...")).toBeNull();
    expect(screen.getByDisplayValue("Achat de chaises")).toBeInTheDocument();
  });
});
