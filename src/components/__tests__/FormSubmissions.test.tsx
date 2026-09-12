// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FormSubmissions from "@/pages/FormSubmissions";
import * as types from "@/types";

vi.mock("@/lib/formSystem", () => ({
  formSubmissionRepo: {
    list: vi.fn(async () => []),
  },
}));

import { formSubmissionRepo } from "@/lib/formSystem";

describe("FormSubmissions page", () => {
  it("renders a list of submissions with their data fields", async () => {
    formSubmissionRepo.list.mockResolvedValue([
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
    // Le nom et la date de baptême (clés du data JSONB) sont affichés.
    expect(screen.getAllByText("nom").length).toBe(2);
    expect(screen.getAllByText("baptême").length).toBe(2);
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("B").length).toBeGreaterThanOrEqual(1);
  });

  it("renders an empty state when there are no submissions", async () => {
    formSubmissionRepo.list.mockResolvedValue([]);

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
