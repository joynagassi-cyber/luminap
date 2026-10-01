// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FormBuilder from "@/pages/FormBuilder";
import * as types from "@/types";

vi.mock("@/lib/formSystem", () => ({
  formDefinitionRepo: {
    list: vi.fn(async () => []),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
  },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-test"),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return { ...actual, generateId: () => "gen-id" };
});

vi.mock("@/components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/TopHeader", () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => <div data-testid="top-header">{title}</div>,
}));

const { formDefinitionRepo } = await import("@/lib/formSystem");

describe("FormBuilder — Templates", () => {
  it("affiche la section Templates quand aucun formulaire existe", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([]);
    render(<MemoryRouter><FormBuilder /></MemoryRouter>);
    expect(await screen.findByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Sondage")).toBeInTheDocument();
    expect(screen.getByText("Enregistrement membre")).toBeInTheDocument();
    expect(screen.getByText("Rapport d'incident")).toBeInTheDocument();
  });

  it("dupliquer un template pré-remplit le modal de création", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([]);
    render(<MemoryRouter><FormBuilder /></MemoryRouter>);
    // 3 boutons « Duplicer ce modèle » (un par template) : on clique sur
    // le premier (Sondage, rendu dans l'ordre de FORM_TEMPLATES).
    fireEvent.click(
      screen.getAllByText("Dupliquer ce modèle", { exact: false })[0],
    );
    // Le modal s'ouvre avec les fields du template pré-chargés
    // (L'IonInput natif ne rend pas son value en DOM — on vérifie le
    // compteur de champs du modal, qui reflète le pre-fill).
    await screen.findByText("Nouveau formulaire");
    expect(screen.getByText("Champs (4)")).toBeInTheDocument();
  });
});
