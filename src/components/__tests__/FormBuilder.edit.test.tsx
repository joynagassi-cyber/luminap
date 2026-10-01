// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// Mock ciblé avec importOriginal pour conserver les autres utilitaires
// réexportés par BottomNav/TopHeader (ex. tint).
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return { ...actual, generateId: (...args: unknown[]) => `id-${args.join("-")}` };
});

// Neutralise la barre de navigation complète.
vi.mock("@/components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
}));

// TopHeader : simple conteneur avec le titre.
vi.mock("@/components/TopHeader", () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="top-header">{title}</div>
  ),
}));

const { formDefinitionRepo } = await import("@/lib/formSystem");

const DRAFT_FORM: types.FormDefinition = {
  id: "form-draft-1",
  orgId: "org-test",
  key: "demande_cotisation",
  name: "Demande de cotisation",
  description: "Cotisation mensuelle",
  version: 1,
  targetEntityType: null,
  status: "DRAFT",
  fields: [
    { key: "nom", label: "Nom du membre", type: "text", required: true, order: 0 },
    { key: "montant", label: "Montant", type: "currency", required: false, order: 1 },
  ],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const PUBLISHED_FORM: types.FormDefinition = {
  ...DRAFT_FORM,
  id: "form-pub-1",
  name: "Formulaire publié",
  status: "PUBLISHED",
};

describe("FormBuilder — édition DRAFT", () => {
  it("affiche un bouton « Modifier » sur un formulaire DRAFT et pré-remplit le modal", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([DRAFT_FORM]);

    render(<MemoryRouter><FormBuilder /></MemoryRouter>);

    await screen.findByText("Demande de cotisation");
    const modifierBtn = screen.getByRole("button", { name: /Modifier/i });
    expect(modifierBtn).toBeInTheDocument();

    fireEvent.click(modifierBtn);

    // Le modal d'édition s'ouvre, pré-rempli.
    expect(await screen.findByText(/Modifier le formulaire/i)).toBeInTheDocument();
    // Compteur de champs pré-chargés (l'IonInput natif ne rend pas son
    // value en DOM en jsdom — on vérifie le pre-fill via le compteur,
    // même pattern que FormBuilder.templates.test.tsx).
    expect(screen.getByText("Champs (2)")).toBeInTheDocument();
    // Les champs sont pré-remplis (label des champs éditables).
    expect(screen.getByDisplayValue("Nom du membre")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Montant")).toBeInTheDocument();
    // Le bouton de sauvegarde est « Enregistrer ».
    const saveBtn = screen.getByText(/Enregistrer/i);
    expect(saveBtn).toBeInTheDocument();
  });

  it("n'affiche pas de bouton Modifier pour un formulaire PUBLISHED", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([PUBLISHED_FORM]);

    render(<MemoryRouter><FormBuilder /></MemoryRouter>);

    await screen.findByText("Formulaire publié");
    expect(screen.queryByRole("button", { name: /Modifier/i })).not.toBeInTheDocument();
  });

  it("sauvegarde : update appelé avec fields et version incrémentée", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([DRAFT_FORM]);

    render(<MemoryRouter><FormBuilder /></MemoryRouter>);

    await screen.findByText("Demande de cotisation");
    fireEvent.click(screen.getByRole("button", { name: /Modifier/i }));
    await screen.findByText(/Modifier le formulaire/i);

    // On change le label du 1er champ pour simuler une édition.
    const firstFieldInput = screen.getByDisplayValue("Nom du membre");
    fireEvent.change(firstFieldInput, { target: { value: "Nom complet" } });

    // Le bouton de sauvegarde est « Enregistrer » en mode édition.
    const saveBtn = screen.getByText(/Enregistrer/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(formDefinitionRepo.update).toHaveBeenCalled();
    });

    const call = vi.mocked(formDefinitionRepo.update).mock.calls[0];
    expect(call[0]).toBe(DRAFT_FORM.id);
    const payload = call[1] as Partial<types.FormDefinition>;
    // Les champs ont été mis à jour.
    expect(payload.fields?.[0]?.label).toBe("Nom complet");
    // La version est incrémentée.
    expect(payload.version).toBe(DRAFT_FORM.version + 1);
  });
});
