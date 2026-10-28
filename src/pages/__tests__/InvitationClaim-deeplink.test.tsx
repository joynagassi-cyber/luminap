// @vitest-environment jsdom
/**
 * R125 — un lien profond `lumina://invitation/claim?code=AB12` (ou l'URL web
 * équivalente) doit ouvrir l'écran de réclamation AVEC le code prérempli.
 *
 * Avant le correctif, deux défauts se cumulaient :
 *   1. `parseDeepLink` réécrivait `/invitation/claim` (route PUBLIQUE) en
 *      `/dashboard`, car l'allowlist `returnTo` ne retenait que les routes
 *      `kind === "app"` ;
 *   2. `code` était lu sur n'importe quelle URL → un lien d'invitation était
 *      traité comme un callback OAuth.
 * Ici on verrouille l'effet observable côté écran : le champ « code » est
 * prérempli depuis `?code=`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Ionic → HTML (noms accessibles observables en jsdom) ─────────────────
vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "user-1",
    email: "invite@example.com",
    firstName: "Ines",
    lastName: "Invitee",
    role: "MEMBRE",
    org: { id: "org-1", name: "Lumina", type: "Église", accentColor: "#fff" },
  }),
  selectRole: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  authService: {
    getState: () => ({ session: null, profile: null }),
    subscribe: () => () => {},
  },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/hooks/useKeyboardAvoidance", () => ({
  useKeyboardAvoidance: () => 0,
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

vi.mock("@/components/CameraScanner", () => ({
  default: () => <div data-testid="camera-scanner" />,
}));

import InvitationClaim from "@/pages/InvitationClaim";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <InvitationClaim />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
});

describe("R125 — /invitation/claim préremplit le code du lien profond", () => {
  it("le champ « code » est prérempli depuis `?code=AB12`", async () => {
    renderAt("/invitation/claim?code=AB12");
    // Le champ est identifié par sa VALEUR (le libellé IonLabel n'est pas
    // associé au IonInput dans le mock Ionic → pas de nom accessible).
    const input = await screen.findByDisplayValue("AB12");
    expect(input).toHaveValue("AB12");
  });

  it("sans `?code=`, le champ reste vide (pas de valeur inventée)", async () => {
    renderAt("/invitation/claim");
    // Aucun champ ne doit porter de valeur préremplie inventée.
    expect(screen.queryByDisplayValue(/^[A-Z0-9-]{4,}$/)).toBeNull();
    const input = screen.getByTestId("ion-input");
    expect(input).toHaveValue("");
  });
});
