// @vitest-environment jsdom
/**
 * R52.k — `/forms` (FormBuilder) et `/forms/custom-fields` (CustomFields)
 * annonçaient « Pas encore de formulaire / de champ » avant la première
 * lecture (motif R52 : « pas encore lu » ≠ « vide »).
 *
 * Les deux pages lisent leurs données en asynchrone
 * (`formDefinitionRepo.list`, `customFieldRepo.list`) : au premier rendu la
 * liste est `[]` sans signal de disponibilité.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// Résolution contrôlée : la lecture ne répond pas avant qu'on le décide.
let resolveForms: (v: unknown[]) => void;
let resolveFields: (v: unknown[]) => void;

vi.mock("@/lib/formSystem", () => ({
  formDefinitionRepo: {
    list: () => new Promise((r) => { resolveForms = r as (v: unknown[]) => void; }),
  },
}));
vi.mock("@/lib/customFields", () => ({
  customFieldRepo: {
    list: () => new Promise((r) => { resolveFields = r as (v: unknown[]) => void; }),
  },
  customFieldValueRepo: {},
}));
vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));
vi.mock("@/lib/utils", () => ({ generateId: () => "id-1" }));
vi.mock("@/lib/formTemplates", () => ({
  FORM_TEMPLATES: [],
  materializeTemplate: (t: unknown) => t,
}));
vi.mock("@/components/TopHeader", () => ({ default: () => <div /> }));
vi.mock("@/components/BottomNav", () => ({ default: () => <div /> }));

import FormBuilder from "@/pages/FormBuilder";
import CustomFields from "@/pages/CustomFields";

afterEach(cleanup);

describe("R52.k — formulaires/champs : « pas encore » avant la première lecture", () => {
  it("/forms affiche un squelette, pas « Pas encore de formulaire »", () => {
    const { container } = render(
      <MemoryRouter>
        <FormBuilder />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Pas encore de formulaire")).toBeNull();
  });

  it("/forms/custom-fields affiche un squelette, pas « Pas encore de champ personnalisé »", () => {
    const { container } = render(
      <MemoryRouter>
        <CustomFields />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Pas encore de champ personnalisé")).toBeNull();
  });

  it("le message vide exact apparaît une fois la lecture terminée", async () => {
    render(
      <MemoryRouter>
        <FormBuilder />
      </MemoryRouter>,
    );
    resolveForms([]);
    await waitFor(() => expect(screen.getByText("Pas encore de formulaire")).toBeInTheDocument());
  });
});
