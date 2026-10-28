// @vitest-environment jsdom
/**
 * R52.s — `/event/:id/edit` : « Chargement... » INFINI quand l'événement est
 * absent, et champ « Nom » jamais pré-rempli (enregistrement impossible).
 *
 * Même famille que R52.l→R52.r (D-R41) : l'écran ne distinguait pas
 * « pas encore lu » de « réellement absent », et le formulaire s'ouvrait vide.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const state = {
  ready: false,
  events: [] as Array<Record<string, unknown>>,
};

vi.mock("@/lib/dataLayer", () => ({
  useEvents: () => ({ data: state.events, isLoading: false }),
  useCategories: () => ({ data: [] }),
  updateEventPS: vi.fn(async () => undefined),
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));
vi.mock("@/hooks/useKeyboardAvoidance", () => ({ useKeyboardAvoidance: () => 0 }));
vi.mock("@ionic/react", () => {
  const Passthrough =
    (tag: string) =>
    ({ children, ...rest }: any) =>
      React.createElement(tag, rest, children);
  const Field = ({ value, children, ...rest }: any) =>
    React.createElement("input", { ...rest, value: value ?? "", readOnly: true }, children);
  return {
    IonPage: Passthrough("div"),
    IonHeader: Passthrough("div"),
    IonContent: Passthrough("div"),
    IonTitle: Passthrough("div"),
    IonToolbar: Passthrough("div"),
    IonItem: Passthrough("div"),
    IonLabel: Passthrough("label"),
    IonInput: Field,
    IonTextarea: Field,
    IonSelect: Passthrough("select"),
    IonSelectOption: Passthrough("option"),
  };
});

vi.mock("@/components/TopHeader", () => ({ default: () => null }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

import EventEdit from "@/pages/EventEdit";

afterEach(cleanup);

function renderAt(id = "ev-1") {
  return render(
    <MemoryRouter initialEntries={[`/event/${id}/edit`]}>
      <Routes>
        <Route path="/event/:id/edit" element={<EventEdit />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("R52.s — /event/:id/edit", () => {
  it("affiche le squelette (jamais « introuvable ») avant la 1re lecture", () => {
    state.ready = false;
    state.events = [];
    renderAt();
    expect(screen.getByText("Chargement...")).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/)).toBeNull();
  });

  it("annonce « introuvable » avec une action de retour quand l'événement est réellement absent", () => {
    state.ready = true;
    state.events = [];
    renderAt("absent");
    expect(screen.getByText("Cet événement est introuvable.")).toBeInTheDocument();
    expect(screen.getByText("Retour aux événements")).toBeInTheDocument();
  });

  it("pré-remplit le nom de l'événement (sinon l'enregistrement est impossible)", () => {
    state.ready = true;
    state.events = [
      {
        id: "ev-1",
        name: "Culte du dimanche",
        description: "desc",
        start_date: "2026-11-01",
        end_date: null,
        status: "PLANIFIED",
        budget: 150000,
      },
    ];
    const { container } = renderAt("ev-1");
    expect(screen.queryByText("Chargement...")).toBeNull();
    // `ion-input` est un composant Ionic : la valeur se lit sur la propriété
    // `value`, pas dans le HTML sérialisé.
    expect(screen.getByDisplayValue("Culte du dimanche")).toBeInTheDocument();
  });
});
