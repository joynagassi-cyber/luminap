// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock ciblé du dataLayer (pattern FormFill.submitBy.test.tsx).
vi.mock("@/lib/dataLayer", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    useCurrentUser: vi.fn(() => ({
      id: "user-42",
      email: "u42@test.org",
      firstName: "Ada",
      lastName: "Lovelace",
      role: "ADMIN",
      org: { id: "org-1", name: "Lumina", type: "Eglise", accentColor: "#FF6B00" },
    })),
    useMembers: vi.fn(() => ({ data: [] })),
    useGroups: vi.fn(() => ({ data: [] })),
    useEvents: vi.fn(() => ({ data: [] })),
    useAccounts: vi.fn(() => ({ data: [] })),
  };
});

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async (sub: any) => ({
    id: "sub-1",
    createdAt: "2026-10-01T00:00:00Z",
    ...sub,
  })),
}));

// Mock du formSystem : formulaire avec un champ currency + validation réelle
// (importOriginal) pour vérifier le rejet de « abc ».
vi.mock("@/lib/formSystem", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    formDefinitionRepo: {
      get: vi.fn(async () => ({
        id: "form-1",
        orgId: "org-1",
        key: "montant-test",
        name: "Formulaire montant",
        description: "",
        version: 1,
        targetEntityType: null,
        status: "PUBLISHED",
        fields: [
          { key: "montant", type: "currency", label: "Montant", required: true, order: 0 },
        ],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })),
      list: vi.fn(async () => []),
      create: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
    formSubmissionRepo: {
      create: createMock,
      get: vi.fn(async () => null),
      list: vi.fn(async () => []),
      update: vi.fn(async () => null),
    },
  };
});
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-1"),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return { ...actual, generateId: (...args: unknown[]) => `id-${args.join("-")}` };
});

vi.mock("@/components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/TopHeader", () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => <div data-testid="top-header">{title}</div>,
}));

import FormFill from "@/pages/FormFill";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/forms/fill/form-1"]}>
      <FormFill />
    </MemoryRouter>,
  );
}

describe("FormFill — champ currency (T7 Forms v2)", () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it("rend un champ currency avec le symbole de devise par défaut ($)", async () => {
    renderPage();
    await screen.findByText("Formulaire montant");
    // Le préfixe de devise est affiché (symbole $ par défaut, sans org param).
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("stocke la saisie « 1,500 » comme le nombre 1500", async () => {
    renderPage();
    await screen.findByText("Formulaire montant");

    const input = screen.getByPlaceholderText("Montant") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,500" } });
    fireEvent.click(screen.getByText("Soumettre"));

    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    const arg = vi.mocked(createMock).mock.calls[0][0];
    expect(arg.data.montant).toBe(1500);
  });

  it("rejette la saisie « abc » (validation : montant invalide)", async () => {
    renderPage();
    await screen.findByText("Formulaire montant");

    const input = screen.getByPlaceholderText("Montant") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByText("Soumettre"));

    await screen.findByText(/montant invalide/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("accepte la virgule décimale FR : « 1,50 » -> 1.5", async () => {
    renderPage();
    await screen.findByText("Formulaire montant");

    const input = screen.getByPlaceholderText("Montant") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,50" } });
    fireEvent.click(screen.getByText("Soumettre"));

    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    const arg = vi.mocked(createMock).mock.calls[0][0];
    expect(arg.data.montant).toBe(1.5);
  });
});
