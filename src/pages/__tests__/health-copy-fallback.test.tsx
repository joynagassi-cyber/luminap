// @vitest-environment jsdom
/**
 * Santé — repli de copie du diagnostic.
 *
 * Verrouille le correctif de bug natif : quand `navigator.clipboard` échoue,
 * l'ancien repli `window.prompt` était un **no-op dans la WebView Android**
 * (copie muette, aucun feedback). On exige désormais une **feuille maison**
 * exposant le texte sélectionnable, et l'absence totale de `window.prompt`.
 *
 * ── NON-VACUITÉ ──────────────────────────────────────────────────────────────
 *   - Revenir à `window.prompt(...)` dans `copyDiagnostic` → le test
 *     « ouvre la feuille de copie manuelle » échoue (le texte n'est plus rendu).
 *   Vérifié en local.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
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
vi.mock("@/lib/dataLayer", () => ({
  deleteAllLocalData: vi.fn(async () => undefined),
  isPowerSyncReadyNow: () => false,
  useOrganizations: () => ({ data: [] }),
  useMembers: () => ({ data: [] }),
}));
vi.mock("@/lib/orgContext", () => ({
  resetOrganizationId: vi.fn(),
  getOrganizationId: () => "__no_org__",
  hasResolvedOrganization: () => true,
}));
vi.mock("@/lib/organization-context", () => ({
  useOrganizationContext: () => ({
    mode: "ORG",
    orgId: "__no_org__",
    label: "Votre organisation",
  }),
}));
vi.mock("@/platform/networkState", () => ({ isOnline: () => true }));
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Health />
    </MemoryRouter>,
  );
}

describe("Santé — repli de copie du diagnostic (Android)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "prompt", {
      writable: true,
      value: vi.fn(),
    });
  });

  it("ouvre une feuille de copie manuelle quand le presse-papiers échoue", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("refusé")) },
    });

    renderPage();
    expect(screen.queryByTestId("health.copy-diagnostic-fallback")).toBeNull();

    fireEvent.click(screen.getByTestId("health.copy-diagnostic"));

    const sheet = await screen.findByTestId("health.copy-diagnostic-fallback");
    expect(sheet).toBeInTheDocument();
    const text = screen.getByTestId("health.copy-diagnostic-text") as HTMLTextAreaElement;
    expect(text.value.length).toBeGreaterThan(0);
    // Jamais de modulateur système (no-op WebView Android).
    expect(window.prompt).not.toHaveBeenCalled();
  });

  it("n'ouvre pas la feuille quand la copie réussit", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    renderPage();
    fireEvent.click(screen.getByTestId("health.copy-diagnostic"));

    await waitFor(() =>
      expect(screen.getByText("Diagnostic copié")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("health.copy-diagnostic-fallback")).toBeNull();
    expect(window.prompt).not.toHaveBeenCalled();
  });
});
