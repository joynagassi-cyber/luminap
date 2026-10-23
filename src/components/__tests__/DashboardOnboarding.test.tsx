// @vitest-environment jsdom
/**
 * Tests de l'onboarding dynamique du dashboard.
 *
 * La logique de progression est PURE (`computeOnboardingProgress`) : elle est
 * testée directement, sans monter le dashboard ni simuler PowerSync. Le
 * composant est ensuite monté pour vérifier le rendu réel (masquage,
 * navigation, progression) avec des données d'org contrôlées.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  computeOnboardingProgress,
  isOnboardingComplete,
  ONBOARDING_STEPS,
  type OnboardingCounts,
} from "@/components/DashboardOnboarding";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

// Compteurs contrôlés par les tests (hoisting-safe : portés par globalThis).
const counts: OnboardingCounts = {
  transactions: 0,
  members: 0,
  events: 0,
  invitations: 0,
};

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: Array(counts.transactions).fill({}) }),
  useMembers: () => ({ data: Array(counts.members).fill({}) }),
  useEvents: () => ({ data: Array(counts.events).fill({}) }),
  useInvitations: () => ({ data: Array(counts.invitations).fill({}) }),
}));

const orgState = { resolved: true };
vi.mock("@/lib/orgContext", () => ({
  hasResolvedOrganization: () => orgState.resolved,
}));

import DashboardOnboarding from "@/components/DashboardOnboarding";

function setCounts(next: Partial<OnboardingCounts>) {
  Object.assign(counts, {
    transactions: 0,
    members: 0,
    events: 0,
    invitations: 0,
    ...next,
  });
}

describe("computeOnboardingProgress — logique pure", () => {
  it("aucune donnée : les 4 étapes sont à faire, dans l'ordre déclaré", () => {
    const steps = computeOnboardingProgress({
      transactions: 0,
      members: 0,
      events: 0,
      invitations: 0,
    });
    expect(steps.map((s) => s.id)).toEqual(ONBOARDING_STEPS.map((s) => s.id));
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("une donnée présente marque SON étape comme faite (et elle seule)", () => {
    const steps = computeOnboardingProgress({
      transactions: 3,
      members: 0,
      events: 0,
      invitations: 0,
    });
    const byId = Object.fromEntries(steps.map((s) => [s.id, s.done]));
    expect(byId["first-transaction"]).toBe(true);
    expect(byId["first-member"]).toBe(false);
    expect(byId["first-event"]).toBe(false);
    expect(byId["first-invitation"]).toBe(false);
  });

  it("les étapes faites passent à la fin (l'étape suivante est en tête)", () => {
    const steps = computeOnboardingProgress({
      transactions: 1,
      members: 1,
      events: 0,
      invitations: 0,
    });
    expect(steps[0].id).toBe("first-event");
    expect(steps[0].done).toBe(false);
    // Les deux dernières sont les étapes faites.
    expect(steps.slice(2).every((s) => s.done)).toBe(true);
  });

  it("organisation complète : isOnboardingComplete = true", () => {
    expect(
      isOnboardingComplete({
        transactions: 1,
        members: 1,
        events: 1,
        invitations: 1,
      }),
    ).toBe(true);
  });

  it("un seul compteur à zéro suffit à rendre l'organisation incomplète", () => {
    expect(
      isOnboardingComplete({
        transactions: 5,
        members: 5,
        events: 5,
        invitations: 0,
      }),
    ).toBe(false);
  });
});

describe("DashboardOnboarding — rendu", () => {
  beforeEach(() => {
    navigate.mockClear();
    localStorage.clear();
    orgState.resolved = true;
    setCounts({});
  });
  afterEach(cleanup);

  it("organisation vierge : la carte s'affiche et met la 1re étape en avant", () => {
    render(<DashboardOnboarding />);
    expect(screen.getByTestId("dashboard-onboarding")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-progress")).toHaveTextContent(
      "0 sur 4 étapes terminées",
    );
    const next = screen.getByTestId("onboarding-next-first-transaction");
    fireEvent.click(next);
    expect(navigate).toHaveBeenCalledWith("/transaction/new");
  });

  it("progression réelle : 2 étapes faites sont comptées", () => {
    setCounts({ transactions: 4, members: 2 });
    render(<DashboardOnboarding />);
    expect(screen.getByTestId("onboarding-progress")).toHaveTextContent(
      "2 sur 4 étapes terminées",
    );
    // L'étape mise en avant est la prochaine à faire, pas une étape faite.
    expect(
      screen.getByTestId("onboarding-next-first-event"),
    ).toBeInTheDocument();
  });

  it("organisation complète : la carte disparaît d'elle-même", () => {
    setCounts({ transactions: 1, members: 1, events: 1, invitations: 1 });
    render(<DashboardOnboarding />);
    expect(screen.queryByTestId("dashboard-onboarding")).not.toBeInTheDocument();
    // L'achèvement est mémorisé : plus jamais proposé.
    expect(localStorage.getItem("lumina-onboarding-done")).toBe("true");
  });

  it("masquage explicite : la carte disparaît et reste masquée", () => {
    render(<DashboardOnboarding />);
    fireEvent.click(screen.getByTestId("onboarding-dismiss"));
    expect(screen.queryByTestId("dashboard-onboarding")).not.toBeInTheDocument();
    expect(localStorage.getItem("lumina-onboarding-dismissed")).toBe("true");
    cleanup();
    render(<DashboardOnboarding />);
    expect(screen.queryByTestId("dashboard-onboarding")).not.toBeInTheDocument();
  });

  it("sans organisation résolue : pas de carte (le guide mentirait)", () => {
    orgState.resolved = false;
    render(<DashboardOnboarding />);
    expect(screen.queryByTestId("dashboard-onboarding")).not.toBeInTheDocument();
  });
});
