// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FormBuilder, { addField } from "@/pages/FormBuilder";
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

// BottomNav (rendu par la page) : neutraliser la barre de navigation complète
// pour que le test reste rapide et déterministe.
vi.mock("@/components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
}));

// TopHeader : idem, un simple conteneur avec le titre.
vi.mock("@/components/TopHeader", () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => <div data-testid="top-header">{title}</div>,
}));

const { formDefinitionRepo } = await import("@/lib/formSystem");

describe("FormBuilder — addField", () => {
  it("initilise la config par type (reference → referenceEntityType)", () => {
    const f = addField({ type: "reference" }) as any;
    expect(f.referenceEntityType).toBe("member"); // défaut raisonné
    expect(f.mapsToEntityField).toBeUndefined();
  });

  it("ne pré-initialise rien pour les autres types", () => {
    const f = addField({ type: "text" }) as any;
    expect(f.referenceEntityType).toBeUndefined();
    expect(f.conditional).toBeUndefined();
  });
});

describe("FormBuilder — rendu de la liste", () => {
  it("affiche les formulaires avec boutons Publier et Soumissions", async () => {
    vi.mocked(formDefinitionRepo.list).mockResolvedValue([
      {
        id: "form-1",
        orgId: "org-test",
        key: "demande_cotisation",
        name: "Demande de cotisation",
        description: "",
        version: 1,
        targetEntityType: null,
        status: "DRAFT",
        fields: [] as types.FormFieldDefinition[],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      } as types.FormDefinition,
    ]);

    render(<MemoryRouter><FormBuilder /></MemoryRouter>);

    await screen.findByText("Demande de cotisation");
    expect(screen.getByText("Publier")).toBeInTheDocument();
    expect(screen.getByText("Soumissions")).toBeInTheDocument();
  });
});
