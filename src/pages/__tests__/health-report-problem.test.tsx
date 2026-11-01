// @vitest-environment jsdom
/**
 * PR5 — « Signaler un problème » : la page Santé ENVOIE réellement.
 *
 * Avant ce correctif, le bouton `health.report-problem` ne faisait que COPIER
 * un texte (`copyDiagnostic`) : aucun signal durable, inexploitable par le
 * support. Ce test verrouille le comportement réel de bout en bout :
 *   - cliquer « Signaler un problème » ouvre la note facultative ;
 *   - « Envoyer le signalement » appelle le VRAI `sendProblemReport`
 *     (on vérifie l'effet observable : un enregistrement local est créé et la
 *     ligne « Dernier signalement » apparaît) ;
 *   - « Copier le diagnostic » reste une affordance SÉPARÉE.
 *
 * NON-VACUITÉ : remettre `onClick={copyDiagnostic}` sur le bouton principal
 * (au lieu d'ouvrir la note) → la note et le bouton d'envoi ne s'affichent
 * jamais, `getLastProblemReport()` reste `null` → le test échoue.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

// Données de santé stables (le cœur pur est testé ailleurs) : une organisation
// non résolue + une erreur récente → le rapport doit porter ces faits. On garde
// les fonctions PURES réelles (`buildHealthReport` utilisé par `reportProblem`)
// et on ne remplace que la collecte d'environnement (hook + inputs).
vi.mock("@/lib/health", async () => {
  const actual = await vi.importActual<typeof import("@/lib/health")>(
    "@/lib/health",
  );
  return {
    ...actual,
    useHealthSnapshot: () => ({
      generatedAt: "2026-10-31T08:00:00.000Z",
      overall: "error",
      checks: [
        { id: "org", label: "Organisation active", level: "error", detail: "aucune" },
        { id: "version", label: "Version", level: "ok", detail: "1.0.9" },
      ],
    }),
    collectHealthInputs: () => ({
      appVersion: "1.0.9",
      platform: "web",
      online: true,
      syncReady: true,
      hasOrg: false,
      orgId: "__no_org__",
      recentErrorCount: 1,
      lastErrorMessage: "boom",
    }),
  };
});

vi.mock("@/lib/clientErrors", async () => {
  // `redact` est requis par `reportProblem` : on garde la vraie implémentation
  // et on ne remplace que la collecte (buffer + capture).
  const actual = await vi.importActual<typeof import("@/lib/clientErrors")>(
    "@/lib/clientErrors",
  );
  return {
    ...actual,
    getRecentErrors: () => [{ source: "onerror", message: "boom" }],
    captureClientError: vi.fn(),
  };
});

vi.mock("@/lib/powersync", () => ({ disconnectPowerSync: vi.fn(async () => undefined) }));
vi.mock("@/lib/dataLayer", () => ({ deleteAllLocalData: vi.fn(async () => undefined) }));
vi.mock("@/lib/orgContext", () => ({ resetOrganizationId: vi.fn() }));

import Health from "@/pages/Health";
import { getLastProblemReport, clearProblemReports } from "@/lib/reportProblem";

beforeEach(() => {
  clearProblemReports();
});

afterEach(() => {
  cleanup();
  clearProblemReports();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Health />
    </MemoryRouter>,
  );
}

describe("PR5 — page Santé : « Signaler un problème » envoie", () => {
  it("ouvre la note facultative puis ENVOIE (enregistrement local créé)", () => {
    renderPage();

    // Le bouton principal ouvre la note (il ne copie plus).
    fireEvent.click(screen.getByTestId("health.report-problem"));
    const note = screen.getByTestId("health.report-note");
    fireEvent.change(note, { target: { value: "ça plante" } });

    expect(getLastProblemReport()).toBeNull();
    fireEvent.click(screen.getByTestId("health.report-send"));

    // Effet observable du VRAI envoi : un rapport local est conservé.
    const last = getLastProblemReport();
    expect(last).not.toBeNull();
    expect(last?.note).toBe("ça plante");
    expect(last?.failedChecks).toContain("org");
    expect(screen.getByTestId("health.last-report")).toBeInTheDocument();
  });

  it("le rapport envoyé ne contient aucune PII (pas d'orgId brut)", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("health.report-problem"));
    fireEvent.click(screen.getByTestId("health.report-send"));

    const last = getLastProblemReport();
    expect(JSON.stringify(last)).not.toContain("__no_org__");
    expect(JSON.stringify(last)).not.toContain('"orgId"');
  });

  it("« Copier le diagnostic » reste une affordance séparée", () => {
    renderPage();
    expect(screen.getByTestId("health.copy-diagnostic")).toBeInTheDocument();
  });
});
