// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FormSubmissions from "@/pages/FormSubmissions";
import * as types from "@/types";

vi.mock("@/lib/formSystem", () => ({
  formSubmissionRepo: {
    list: vi.fn(async () => []),
    update: vi.fn(async () => null),
  },
  formDefinitionRepo: {
    get: vi.fn(async () => null),
  },
  buildSubmissionsCSV: vi.fn(() => "a;b\n1;2"),
  exportSubmissionsAsXLSX: vi.fn(),
}));

import { formDefinitionRepo, formSubmissionRepo, buildSubmissionsCSV, exportSubmissionsAsXLSX } from "@/lib/formSystem";

const FORM_DEF = {
  id: "form-1",
  orgId: "org-1",
  key: "baptemes",
  name: "Baptêmes",
  version: 1,
  status: "PUBLISHED",
  fields: [
    { key: "nom", label: "Nom", type: "text", required: true, order: 0 },
    { key: "montant", label: "Montant", type: "currency", required: false, order: 1 },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} as types.FormDefinition;

const SUBS: types.FormSubmission[] = [
  {
    id: "sub-1",
    orgId: "org-1",
    formDefinitionId: "form-1",
    formVersion: 1,
    submittedBy: "user-1",
    submittedAt: "2026-01-02T00:00:00Z",
    data: { nom: "A", montant: 1500 },
    status: "SUBMITTED",
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "sub-2",
    orgId: "org-1",
    formDefinitionId: "form-1",
    formVersion: 1,
    submittedBy: "user-2",
    submittedAt: "2026-02-03T00:00:00Z",
    data: { nom: "B", montant: 2500 },
    status: "SUBMITTED",
    createdAt: "2026-02-03T00:00:00Z",
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forms/form-1/submissions"]}>
      <Routes>
        <Route path="/forms/:id/submissions" element={<FormSubmissions />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FormSubmissions — vue tableau", () => {
  it("rend un tableau HTML avec colonnes métadonnées + champs du formulaire", async () => {
    vi.mocked(formDefinitionRepo.get).mockResolvedValue(FORM_DEF);
    vi.mocked(formSubmissionRepo.list).mockResolvedValue(SUBS);

    renderPage();

    await screen.findByRole("table");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim() ?? "");
    expect(headers).toContain("Soumetteur");
    expect(headers.some((h) => h.startsWith("Date"))).toBeTruthy();
    expect(headers).toContain("Nom");
    expect(headers).toContain("Montant");
    expect(headers).toContain("Statut");
    // Les deux soumissions sont bien dans le corps du tableau.
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(3); // 1 header + 2 rows
    // La valeur monétaire est formatée en franc CFA (fr-FR : "1 500 F CFA"
    // avec espaces insécables U+202F — on cherche le code "CFA").
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows.some((r) => r.textContent?.includes("CFA"))).toBeTruthy();
  });

  it("filtre les lignes par recherche plein-texte (insensible à la casse)", async () => {
    vi.mocked(formDefinitionRepo.get).mockResolvedValue(FORM_DEF);
    vi.mocked(formSubmissionRepo.list).mockResolvedValue(SUBS);

    renderPage();
    await screen.findByRole("table");

    const input = screen.getByPlaceholderText(/rechercher/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "USER-1" } });

    // Le débounce est volontairement ~300 ms : on l'attend réellement.
    await waitFor(
      () => {
        const rowCount = screen.getAllByRole("row").length;
        expect(rowCount).toBe(2); // header + 1 seule ligne restante
      },
      { timeout: 5000 },
    );
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.queryByText("user-2")).toBeNull();
  });

  it("trie par colonne (cliquer « Date » puis « Soumetteur » inverse l'ordre)", async () => {
    vi.mocked(formDefinitionRepo.get).mockResolvedValue(FORM_DEF);
    vi.mocked(formSubmissionRepo.list).mockResolvedValue(SUBS);

    renderPage();
    await screen.findByRole("table");

    const getNames = () =>
      Array.from(
        screen.getAllByRole("cell").filter((c) =>
          ["user-1", "user-2"].includes(c.textContent ?? ""),
        ),
      ).map((c) => c.textContent);

    // Ordre par défaut : Date desc (user-2 le 2026-02-03 avant user-1).
    expect(getNames()).toEqual(["user-2", "user-1"]);

    const soumetteurHeader = screen.getAllByRole("columnheader").find(
      (h) => h.textContent?.trim().startsWith("Soumetteur"),
    )!;
    soumetteurHeader.click();

    await waitFor(() => {
      expect(getNames()).toEqual(["user-1", "user-2"]); // asc
    });

    soumetteurHeader.click();

    await waitFor(() => {
      expect(getNames()).toEqual(["user-2", "user-1"]); // desc
    });
  });

  it("expose les boutons Exporter CSV et Exporter Excel", async () => {
    vi.mocked(formDefinitionRepo.get).mockResolvedValue(FORM_DEF);
    vi.mocked(formSubmissionRepo.list).mockResolvedValue(SUBS);

    renderPage();
    await screen.findByRole("table");

    const csvEl = screen.getByText("Exporter CSV");
    const xlsxEl = screen.getByText("Exporter Excel");
    csvEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    xlsxEl.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(buildSubmissionsCSV).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ id: "form-1" }),
    );
    expect(exportSubmissionsAsXLSX).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ id: "form-1" }),
      "soumissions_baptemes",
    );
  });
});
