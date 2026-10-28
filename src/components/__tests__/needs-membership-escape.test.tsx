// @vitest-environment jsdom
/**
 * R120 — l'écran « Organisation non rejointe » était un CUL-DE-SAC.
 *
 * R107 a rendu la branche `needs-membership` atteignable pour la première fois.
 * Or `NeedsMembershipScreen` proposait « Retour à l'accueil » → `/dashboard`,
 * qui n'est PAS exempté de `needs-membership` : le bouton secondaire renvoyait
 * l'utilisateur sur le même écran (boucle sans issue). Pire, toutes les routes
 * `app` étant bloquées pour un non-membre, `/settings/profil` (qui porte la
 * déconnexion) était inatteignable — aucune échappatoire n'existait.
 *
 * Ce test verrouille la CAUSE : chaque action offerte par l'écran doit mener à
 * un chemin réellement praticable (route publique, ou action de déconnexion),
 * jamais vers une route soumise à `needs-membership`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NeedsMembershipScreen } from "@/components/RouteStates";
import { resolveRoute, ROUTE_REGISTRY } from "@/lib/routeResolver";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => mockNavigate.mockClear());

/** Routes où un non-membre EST admis (le résolveur rend la main). */
function reachableForNonMember(path: string): boolean {
  const outcome = resolveRoute(path, { isAuthenticated: true, isOrgMember: false });
  return outcome.outcome === "render";
}

describe("R120 — l'écran non-membre offre une échappatoire réelle", () => {
  it("le CTA principal mène à une route praticable pour un non-membre", () => {
    // Garde anti-dérive : le CTA ne doit jamais viser une route bloquée.
    expect(reachableForNonMember("/invitation/claim")).toBe(true);
    render(
      <MemoryRouter>
        <NeedsMembershipScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Saisir un code d'invitation"));
    expect(mockNavigate).toHaveBeenCalledWith("/invitation/claim");
  });

  it("aucune action ne renvoie vers /dashboard (lui-même bloqué)", () => {
    // Preuve du défaut : /dashboard n'est PAS praticable pour un non-membre.
    expect(reachableForNonMember("/dashboard")).toBe(false);

    render(
      <MemoryRouter>
        <NeedsMembershipScreen
          onSignOut={() => mockNavigate("/sessions", { replace: true })}
        />
      </MemoryRouter>,
    );
    // Le bouton « Retour à l'accueil » (mort) a disparu au profit de
    // « Changer de compte ».
    expect(screen.queryByText("Retour à l'accueil")).toBeNull();
    fireEvent.click(screen.getByText("Changer de compte"));
    expect(mockNavigate).toHaveBeenCalledWith("/sessions", { replace: true });
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
  });

  it("sans `onSignOut`, aucun bouton mort n'est rendu", () => {
    render(
      <MemoryRouter>
        <NeedsMembershipScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Changer de compte")).toBeNull();
    expect(screen.queryByText("Retour à l'accueil")).toBeNull();
  });

  it("la seule route praticable hors exemptions est /invitation/claim", () => {
    // Verrouille l'invariant : pour un non-membre, l'ensemble des routes `app`
    // qui rendent la main se réduit aux exemptions (+ la réclamation).
    const appRoutes = ROUTE_REGISTRY.filter(
      (r) => r.kind === "app" && r.pattern !== "*" && !r.pattern.includes(":"),
    ).map((r) => r.pattern);
    const reachable = appRoutes.filter(reachableForNonMember);
    expect(reachable.sort()).toEqual(["/onboarding", "/org-setup"]);
  });
});
