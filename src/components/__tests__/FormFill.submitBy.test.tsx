// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock ciblé du dataLayer : useCurrentUser + les hooks de listes utilisés
// par ReferenceSelect. Le vrai useCurrentUser renvoie directement l'objet
// (jamais null) ; on simule un utilisateur réel "user-42".
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

// Mock du formSystem : formDefinitionRepo.get renvoie un formulaire simple,
// formSubmissionRepo.create capture submittedBy, validation toujours OK.
const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async (sub: any) => ({
    id: "sub-1",
    createdAt: "2026-10-01T00:00:00Z",
    ...sub,
  })),
}));

vi.mock("@/lib/formSystem", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    formDefinitionRepo: {
      get: vi.fn(async () => ({
        id: "form-1",
        orgId: "org-1",
        key: "test",
        name: "Formulaire de test",
        description: "",
        version: 1,
        targetEntityType: null,
        status: "PUBLISHED",
        fields: [
          { key: "name", type: "text", label: "Nom", required: true },
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

describe("FormFill — submittedBy réel (T2 Forms v2)", () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it("utilise l'id de useCurrentUser comme submittedBy (plus de « local-user »)", async () => {
    const { default: navigateMock } = await vi.importActual<any>("react-router-dom");
    void navigateMock;

    render(
      <MemoryRouter initialEntries={["/forms/fill/form-1"]}>
        <FormFill />
      </MemoryRouter>,
    );

    // Le formulaire est chargé (formDefinitionRepo.get mocké).
    await screen.findByText("Formulaire de test");

    // Renseigne le champ requis puis soumet.
    fireEvent.change(screen.getByPlaceholderText("Nom"), {
      target: { value: "Jean Dupont" },
    });
    fireEvent.click(screen.getByText("Soumettre"));

    // La soumission attend 600 ms avant navigation ; on vérifie l'appel.
    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    const arg = vi.mocked(createMock).mock.calls[0][0];
    // submittedBy doit être l'id réel de l'utilisateur courant.
    expect(arg.submittedBy).toBe("user-42");
    expect(arg.submittedBy).not.toBe("local-user");
  });
});
