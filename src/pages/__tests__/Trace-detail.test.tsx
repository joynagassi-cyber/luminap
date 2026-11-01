// @vitest-environment jsdom
/**
 * PR1 — le journal d'audit est réellement CONSULTABLE.
 *
 * Défaut visé : dans `/trace`, chaque ligne affichait un chevron MORT (aucune
 * action) et les champs déjà lus (`before_state`, `after_state`,
 * `actor_role_at_time`, `comment`) n'étaient JAMAIS rendus. L'utilisateur
 * voyait « Modifié » sans savoir CE QUI avait changé — impossible d'auditer
 * une action sensible.
 *
 * Ce fichier verrouille le comportement du détail :
 *   1. un clic sur la ligne déplie le détail (bouton `aria-expanded`,
 *      `aria-controls`) et montre le rôle, le commentaire et le DIFF ;
 *   2. un diff d'objets ne liste QUE les clés changées, avec ancien → nouveau ;
 *   3. « Créé » quand il n'y a pas de `before_state`, « Supprimé » sans
 *      `after_state` ;
 *   4. un JSON illisible ne fait pas planter l'écran : la valeur brute est
 *      affichée ET l'erreur est instrumentée (`captureClientError`).
 *
 * NON-VACUITÉ (preuve) : en retirant le rendu du diff (remplacer
 * `<AuditEntryDetail entry={entry} />` par `null`, ou supprimer le bloc
 * `audit-diff` du composant), les assertions « ancien → nouveau » et
 * « champ modifié » échouent. Vérifié en commentant le panneau de détail :
 * les 4 tests ci-dessous passent au rouge, puis la source est restaurée.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const captureClientError = vi.fn();

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: (...a: unknown[]) => captureClientError(...a),
}));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

const state = {
  ready: true,
  entries: [] as Array<Record<string, unknown>>,
};

vi.mock("@/lib/dataLayer", () => ({
  useAuditEntries: () => ({ data: state.entries, isLoading: false }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useGroups: () => ({ data: [], isLoading: false }),
  useMembers: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  isPowerSyncReadyNow: () => state.ready,
}));

import Trace from "@/pages/Trace";

beforeEach(() => {
  captureClientError.mockReset();
  state.ready = true;
  state.entries = [];
});
afterEach(cleanup);

function entry(overrides: Record<string, unknown>) {
  return {
    id: "a-1",
    org_id: "org-1",
    action: "UPDATE",
    entity_type: "Transaction",
    entity_id: "t-1",
    actor_role_at_time: "TREASURIER",
    before_state: null,
    after_state: null,
    comment: null,
    created_at: "2026-10-31T10:00:00.000Z",
    ...overrides,
  };
}

function renderTrace() {
  return render(
    <MemoryRouter initialEntries={["/trace"]}>
      <Trace />
    </MemoryRouter>,
  );
}

function expandFirstRow() {
  const btn = screen.getByRole("button", { name: /Voir le détail/ });
  expect(btn).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(btn);
  expect(btn).toHaveAttribute("aria-expanded", "true");
  return btn;
}

describe("PR1 — /trace : détail d'entrée d'audit consultable", () => {
  it("déplie le détail accessible (aria-expanded/aria-controls) au clic", () => {
    state.entries = [entry({ before_state: '{"status":"PENDING"}', after_state: '{"status":"APPROVED"}' })];
    renderTrace();

    const btn = expandFirstRow();
    const panelId = btn.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    // Le panneau référencé par aria-controls existe réellement dans le DOM.
    expect(document.getElementById(panelId!)).not.toBeNull();
    expect(screen.getByTestId("audit-entry-detail")).toBeInTheDocument();
  });

  it("montre le champ MODIFIÉ avec sa valeur ancienne → nouvelle", () => {
    state.entries = [
      entry({
        actor_role_at_time: "TREASURIER",
        comment: "Correction du montant",
        before_state: '{"status":"PENDING","amount":1000}',
        after_state: '{"status":"APPROVED","amount":1000}',
      }),
    ];
    renderTrace();
    expandFirstRow();

    // Rôle au moment de l'action + commentaire.
    expect(screen.getByTestId("audit-role")).toHaveTextContent("Trésorier");
    expect(screen.getByTestId("audit-comment")).toHaveTextContent("Correction du montant");

    // La clé réellement modifiée est listée avec ancien → nouveau…
    expect(screen.getByText("status")).toBeInTheDocument();
    const befores = screen.getAllByTestId("audit-diff-before").map((n) => n.textContent);
    const afters = screen.getAllByTestId("audit-diff-after").map((n) => n.textContent);
    expect(befores).toContain("PENDING");
    expect(afters).toContain("APPROVED");

    // …et la clé INCHANGÉE (`amount`) n'est PAS listée.
    expect(screen.queryByText("amount")).toBeNull();
  });

  it("libelle « Créé » sans before_state et « Supprimé » sans after_state", () => {
    state.entries = [
      entry({
        id: "a-create",
        action: "CREATE",
        before_state: null,
        after_state: '{"name":"Nouvelle caisse"}',
      }),
    ];
    const { unmount } = renderTrace();
    expandFirstRow();
    expect(screen.getByTestId("audit-change-kind")).toHaveTextContent("Créé");
    // La clé créée est listée.
    expect(screen.getByText("name")).toBeInTheDocument();
    unmount();

    state.entries = [
      entry({
        id: "a-delete",
        action: "DELETE",
        before_state: '{"name":"Ancienne caisse"}',
        after_state: null,
      }),
    ];
    renderTrace();
    expandFirstRow();
    expect(screen.getByTestId("audit-change-kind")).toHaveTextContent("Supprimé");
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("ne plante PAS sur un JSON illisible : affiche la valeur brute + instrumente l'erreur", () => {
    state.entries = [
      entry({
        before_state: "{ceci n'est pas du json",
        after_state: '{"ok":true}',
      }),
    ];
    renderTrace();
    // Aucune exception ne doit remonter au rendu.
    expandFirstRow();

    expect(screen.getByTestId("audit-entry-detail")).toBeInTheDocument();
    expect(screen.getByTestId("audit-change-kind")).toHaveTextContent("illisible");
    // La valeur brute est bien affichée telle quelle.
    expect(screen.getByText("{ceci n'est pas du json")).toBeInTheDocument();
    // L'erreur est instrumentée (jamais avalée).
    expect(captureClientError).toHaveBeenCalled();
    expect(
      captureClientError.mock.calls.some(([err]) =>
        String((err as Error)?.message ?? err).includes("before_state"),
      ),
    ).toBe(true);
  });
});
