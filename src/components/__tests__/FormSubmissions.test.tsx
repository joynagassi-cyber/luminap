// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FormSubmissions from "@/pages/FormSubmissions";
import * as types from "@/types";

vi.mock("@/lib/formSystem", () => ({
  formSubmissionRepo: {
    list: vi.fn(async () => []),
    update: vi.fn(async () => null),
  },
  formDefinitionRepo: {
    // Le mock pré-F.1c prédatait le chargement du FormDefinition par la page ;
    // renvoyer null (pas de définition) garde l'affichage sur les clés brutes.
    get: vi.fn(async () => null),
  },
  buildSubmissionsCSV: vi.fn(() => "a;b\n1;2"),
  exportSubmissionsAsXLSX: vi.fn(),
}));

import { formSubmissionRepo } from "@/lib/formSystem";

describe("FormSubmissions page", () => {
  it("renders a list of submissions with their data fields", async () => {
    vi.mocked(formSubmissionRepo.list).mockResolvedValue([
      {
        id: "sub-1",
        orgId: "org-1",
        formDefinitionId: "form-1",
        formVersion: 1,
        submittedBy: "user-1",
        submittedAt: "2026-01-02T00:00:00Z",
        data: { nom: "A", baptême: "2026-01-01" },
        status: "SUBMITTED",
        createdAt: "2026-01-02T00:00:00Z",
      } as types.FormSubmission,
      {
        id: "sub-2",
        orgId: "org-1",
        formDefinitionId: "form-1",
        formVersion: 1,
        submittedBy: "user-2",
        submittedAt: "2026-02-03T00:00:00Z",
        data: { nom: "B", baptême: "2026-02-01" },
        status: "SUBMITTED",
        createdAt: "2026-02-03T00:00:00Z",
      } as types.FormSubmission,
    ]);

    render(
      <MemoryRouter initialEntries={["/forms/form-1/submissions"]}>
        <Routes>
          <Route
            path="/forms/:id/submissions"
            element={<FormSubmissions />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Soumissions");
    await waitFor(() =>
      expect(screen.getByText("2 soumission(s)")).toBeInTheDocument(),
    );
    // Vue tableau : les clés du data JSONB sont des colonnes (en-têtes, 1 fois
    // au lieu d'1 par carte) et les valeurs sont dans les cellules du corps.
    expect(screen.getByText("nom")).toBeInTheDocument();
    expect(screen.getByText("baptême")).toBeInTheDocument();
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toContain("A");
    expect(cells).toContain("B");
  });

  it("renders an empty state when there are no submissions", async () => {
    vi.mocked(formSubmissionRepo.list).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/forms/form-1/submissions"]}>
        <Routes>
          <Route
            path="/forms/:id/submissions"
            element={<FormSubmissions />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Aucune soumission pour l'instant.");
  });
});
