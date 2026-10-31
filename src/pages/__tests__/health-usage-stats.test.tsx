// @vitest-environment jsdom
/**
 * PR15 — page Santé : la section « Statistiques d'usage » affiche les
 * compteurs anonymes locaux et se réinitialise.
 *
 * Comportement verrouillé :
 *   1. Les compteurs locaux (écrits par `recordUsage`) sont affichés avec un
 *      libellé FR.
 *   2. Le bouton « Réinitialiser » efface les compteurs et l'état vide FR
 *      apparaît.
 *   3. Aucun compteur n'est affiché quand rien n'a été enregistré.
 *
 * ── NON-VACUITÉ (preuve documentée, vérifiée) ────────────────────────────────
 *   - Retirer le rendu `usageEntries.map(...)` (garder l'état vide) → le test
 *     « affiche les compteurs » échoue.
 *   - Retirer l'appel `clearUsageStats()` de `resetUsage` → le test
 *     « Réinitialiser efface » échoue.
 *   Vérifié : ces mutations passent le test au rouge, puis la source est
 *   restaurée.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});
vi.mock("@sentry/react", () => ({ captureMessage: vi.fn() }));
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/utils/toast", () => ({ showSuccess: vi.fn(), showError: vi.fn() }));
vi.mock("@/lib/powersync", () => ({ disconnectPowerSync: vi.fn(async () => undefined) }));
vi.mock("@/lib/dataLayer", () => ({ deleteAllLocalData: vi.fn(async () => undefined) }));
vi.mock("@/lib/orgContext", () => ({ resetOrganizationId: vi.fn() }));
// Le cœur pur de santé est testé ailleurs : on fige seulement l'instantané
// (sinon `useHealthSnapshot` touche PowerSync/`Capacitor`).
vi.mock("@/lib/health", async () => {
  const actual = await vi.importActual<typeof import("@/lib/health")>(
    "@/lib/health",
  );
  return {
    ...actual,
    useHealthSnapshot: () => ({
      generatedAt: "2026-10-31T08:00:00.000Z",
      overall: "ok",
      checks: [{ id: "version", label: "Version", level: "ok", detail: "1.0.9" }],
    }),
  };
});
vi.mock("@/lib/clientErrors", async () => {
  const actual = await vi.importActual<typeof import("@/lib/clientErrors")>(
    "@/lib/clientErrors",
  );
  return { ...actual, getRecentErrors: () => [], captureClientError: vi.fn() };
});

import Health from "@/pages/Health";
import { recordUsage, clearUsageStats, getUsageStats } from "@/lib/usageStats";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  clearUsageStats();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Health />
    </MemoryRouter>,
  );
}

describe("PR15 — page Santé : statistiques d'usage anonymisées", () => {
  it("affiche l'état vide FR quand aucun compteur n'existe", () => {
    renderPage();
    const block = screen.getByTestId("health.usage-block");
    expect(within(block).getByText("Statistiques d'usage")).toBeInTheDocument();
    expect(screen.getByTestId("health.usage-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("health.usage-list")).toBeNull();
  });

  it("affiche les compteurs enregistrés avec un libellé FR", () => {
    recordUsage("screen:dashboard");
    recordUsage("screen:dashboard");
    recordUsage("action:export-json");
    renderPage();

    const list = screen.getByTestId("health.usage-list");
    expect(within(list).getByText("Accueil")).toBeInTheDocument();
    expect(within(list).getByText("Export JSON")).toBeInTheDocument();
    const dash = screen.getByTestId("health.usage.screen:dashboard");
    expect(within(dash).getByText("2")).toBeInTheDocument();
  });

  it("« Réinitialiser » efface les compteurs (état vide ET stockage vidé)", () => {
    recordUsage("screen:finance");
    renderPage();
    expect(screen.getByTestId("health.usage-list")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("health.usage-reset"));
    expect(screen.queryByTestId("health.usage-list")).toBeNull();
    expect(screen.getByTestId("health.usage-empty")).toBeInTheDocument();
    // Persistance : les compteurs sont réellement effacés du stockage local.
    expect(getUsageStats()).toEqual({});
  });
});
