// @vitest-environment jsdom
/**
 * SettingsProfile — la personnalisation du profil doit être PERSISTÉE EN BASE.
 *
 * Défaut corrigé : « Enregistrer » n'écrivait le prénom/nom que dans
 * `localStorage`. La base Supabase n'était jamais mise à jour → le nom affiché
 * ailleurs (autre appareil, invitation, rapport) restait l'ancien. Ces tests
 * verrouillent l'appel à `authService.updateProfile` et le traitement d'erreur.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const updateProfile = vi.fn();
vi.mock("@/lib/auth", () => ({
  authService: {
    updateProfile: (...args: unknown[]) => updateProfile(...args),
    signOut: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    email: "u@example.com",
    firstName: "Ancien",
    lastName: "Nom",
    role: "TREASURIER",
    org: { id: "org-1", name: "Org", type: "Église" },
  }),
  useOnlineStatus: () => true,
  useNotifications: () => ({ data: [] }),
  useAccounts: () => ({ data: [] }),
  useAppConfig: () => ({
    config: { churchName: "", churchLogoUrl: "", userPhoto: "" },
    updateConfig: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: (s: unknown) => unknown) => sel({ auditEntries: [] }),
}));

vi.mock("@/hooks/useKeyboardAvoidance", () => ({
  useKeyboardAvoidance: () => 0,
}));

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Ionic rend IonInput en custom element (shadow DOM) : en jsdom, sa valeur
// n'est pas reflétée dans l'arbre accessible. Le mock partagé rend un <input>
// avec data-testid="ion-input" et émet onIonInput({ detail: { value } }).
vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

import SettingsProfile from "@/pages/SettingsProfile";

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsProfile />
    </MemoryRouter>,
  );
}

/** Remplit le champ IonInput portant `id` (rendu en <input> par le mock). */
function typeInto(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

describe("SettingsProfile — persistance du nom en base", () => {
  beforeEach(() => {
    localStorage.clear();
    updateProfile.mockReset();
    updateProfile.mockResolvedValue({ error: null });
  });
  afterEach(cleanup);

  it("affiche le libellé correct du rôle « Trésorier » (pas la coquille « Trésurier »)", () => {
    renderPage();
    const badge = screen.getByTestId("profile-role-badge");
    expect(badge.textContent).toContain("Trésorier");
    expect(badge.textContent).not.toContain("Trésurier");
  });

  it("enregistre prénom ET nom via authService.updateProfile (base de vérité)", async () => {
    renderPage();
    typeInto("profile-firstname", "Nouveau");
    typeInto("profile-lastname", "Patronyme");
    fireEvent.click(screen.getByLabelText("Enregistrer le nom"));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        first_name: "Nouveau",
        last_name: "Patronyme",
      }),
    );
    // Le cache local reste cohérent avec la base.
    await waitFor(() =>
      expect(localStorage.getItem("lumina-firstName")).toBe("Nouveau"),
    );
  });

  it("échec d'enregistrement : erreur VISIBLE, cache local NON corrompu", async () => {
    updateProfile.mockResolvedValue({ error: "Réseau indisponible" });
    renderPage();
    typeInto("profile-firstname", "Nouveau");
    fireEvent.click(screen.getByLabelText("Enregistrer le nom"));

    const alert = await screen.findByTestId("profile-save-error");
    expect(alert).toHaveTextContent("Réseau indisponible");
    // Le cache local ne doit PAS mentir : il n'a pas été écrit.
    expect(localStorage.getItem("lumina-firstName")).toBeNull();
  });
});
