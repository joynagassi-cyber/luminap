// @vitest-environment jsdom
/**
 * Mapping navigation — « Créer un culte » ouvre le formulaire en mode CULTE.
 *
 * Défaut mesuré : `Cotisations` passait `{ state: { defaultType: "CULTE" } }` à
 * `/event/new`. Le routeur Ionic ne préserve pas le `location.state` de React
 * Router entre les vues → le formulaire retombait sur le type par défaut
 * « Événement ». Le type passe désormais par QUERY PARAM (`?type=CULTE`),
 * fiable au reload et au deep-link.
 *
 * Non-vacuité : si l'on retire la lecture `new URLSearchParams(location.search)
 * .get("type")` de `EventNew`, le test `?type=CULTE` échoue (le bloc
 * « Paramètres de cotisation », rendu uniquement pour un culte, disparaît).
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/dataLayer", () => ({
  useCategories: () => ({ data: [] }),
  useCaisses: () => ({ data: [] }),
  useMembers: () => ({ data: [] }),
  addEventPS: vi.fn(async () => undefined),
}));
vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: any) =>
    sel({ createCulte: vi.fn(async () => undefined) }),
}));
vi.mock("@/hooks/useKeyboardAvoidance", () => ({ useKeyboardAvoidance: () => 0 }));
vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-test" }));
vi.mock("@/capabilities/notification", () => ({
  notification: { sendNotification: vi.fn(async () => undefined) },
}));
vi.mock("@/components/TopHeader", () => ({ default: () => null }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/DatePicker", () => ({ default: () => null }));
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
    IonButtons: P("div"),
    IonBackButton: P("button"),
    IonInput: ({ onIonInput, value, ...rest }: any) =>
      React.createElement("input", {
        ...rest,
        value,
        onChange: (e: any) =>
          onIonInput?.({ detail: { value: e.target.value } }),
      }),
    IonTextarea: P("textarea"),
    IonButton: ({ children, ...rest }: any) =>
      React.createElement("button", rest, children),
    IonItem: P("div"),
    IonLabel: P("label"),
    IonSelect: P("select"),
    IonSelectOption: P("option"),
  };
});

import EventNew from "@/pages/EventNew";

afterEach(cleanup);

const CULTE_MARKER = "Paramètres de cotisation";

describe("EventNew — mapping du type par query param", () => {
  it("?type=CULTE ouvre le formulaire en mode culte", () => {
    const { queryByText } = render(
      <MemoryRouter initialEntries={["/event/new?type=CULTE"]}>
        <EventNew />
      </MemoryRouter>,
    );
    expect(queryByText(CULTE_MARKER)).not.toBeNull();
  });

  it("sans query param, le formulaire reste en mode événement", () => {
    const { queryByText } = render(
      <MemoryRouter initialEntries={["/event/new"]}>
        <EventNew />
      </MemoryRouter>,
    );
    expect(queryByText(CULTE_MARKER)).toBeNull();
  });
});
