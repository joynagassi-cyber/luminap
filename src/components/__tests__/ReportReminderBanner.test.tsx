// @vitest-environment jsdom
/**
 * PR10 — bannière « Rapport à envoyer » (`ReportReminderBanner`).
 *
 * Verrouille le COMPORTEMENT de l'écran :
 *   - quand un rapport est dû (jamais envoyé, ou cadence dépassée) ET que l'org
 *     a une mère → la bannière est visible et la notification est émise ;
 *   - quand le rappel n'est PAS dû (rapport récent) → AUCUNE bannière, AUCUN
 *     envoi ;
 *   - avant la première lecture PowerSync (`isPowerSyncReadyNow() === false`)
 *     → aucune bannière (règle R52 : pas de verdict avant lecture) ;
 *   - la fermeture du jour masque la bannière ;
 *   - org RACINE (sans mère) → pas de rappel (rien à envoyer).
 *
 * NON-VACUITÉ (preuve documentée, vérifiée) : retirer la garde
 * `ready && loaded && hasParent === true && reminder.due` de `visible` fait
 * afficher la bannière dans le cas « pas dû »/« non prêt » → le test
 * correspondant échoue. Retirer l'`useEffect` de livraison → le test « émet la
 * notification » échoue. Vérifié par mutation puis restauration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sendMock = vi.fn<(r: unknown) => Promise<void>>(async () => {});
const getOrgParentMock = vi.fn(async () => ({ id: "org-parent", name: "Mère" }));
let lastSentAtValue: string | null = null;
let loadedValue = true;
let readyValue = true;

vi.mock("@/lib/dataLayer", () => ({
  useLastSentReport: () => ({ lastSentAt: lastSentAtValue, loaded: loadedValue }),
  isPowerSyncReadyNow: () => readyValue,
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/capabilities/federation", () => ({
  federation: { getOrgParent: () => getOrgParentMock() },
}));

// La livraison est observée sans toucher à OneSignal/PowerSync : on remplace
// `deliverReportReminder` par une sonde qui exerce la vraie décision pure.
vi.mock("@/lib/reportReminders", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reportReminders")>(
    "@/lib/reportReminders",
  );
  return {
    ...actual,
    deliverReportReminder: vi.fn(async (params: {
      lastSentAt: string | null;
      now: string;
      cadenceDays?: number;
    }) => {
      const r = actual.computeReportReminder({
        lastSentAt: params.lastSentAt,
        now: params.now,
        cadenceDays: params.cadenceDays,
      });
      if (r.due) await sendMock(r);
      return { fired: r.due, reason: r.reason, reminder: r };
    }),
  };
});

import ReportReminderBanner, {
  REMINDER_DISMISSED_KEY,
} from "@/components/ReportReminderBanner";

const NOW_ISO = new Date().toISOString();

beforeEach(() => {
  sendMock.mockClear();
  getOrgParentMock.mockReset();
  getOrgParentMock.mockResolvedValue({ id: "org-parent", name: "Mère" });
  lastSentAtValue = null;
  loadedValue = true;
  readyValue = true;
  localStorage.clear();
});

afterEach(cleanup);

function renderBanner() {
  return render(
    <MemoryRouter initialEntries={["/admin/report-send"]}>
      <ReportReminderBanner orgId="org-1" cadenceDays={30} />
    </MemoryRouter>,
  );
}

describe("ReportReminderBanner — visibilité et émission", () => {
  it("jamais envoyé + org avec mère → bannière visible et notification émise", async () => {
    renderBanner();
    await waitFor(() =>
      expect(screen.getByTestId("report-reminder-banner")).toBeInTheDocument(),
    );
    expect(screen.getByText("Rapport à envoyer")).toBeInTheDocument();
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
  });

  it("rapport récent (pas dû) → AUCUNE bannière, AUCUN envoi", async () => {
    lastSentAtValue = NOW_ISO; // envoyé aujourd'hui → cadence non dépassée
    renderBanner();
    await waitFor(() => expect(getOrgParentMock).toHaveBeenCalled());
    expect(screen.queryByTestId("report-reminder-banner")).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("cadence dépassée → bannière visible (raison cadence-elapsed)", async () => {
    lastSentAtValue = new Date(Date.now() - 45 * 86_400_000).toISOString();
    renderBanner();
    const banner = await screen.findByTestId("report-reminder-banner");
    expect(banner.getAttribute("data-reminder-reason")).toBe("cadence-elapsed");
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
  });

  it("PowerSync non prêt → aucune bannière (pas de verdict avant lecture)", async () => {
    readyValue = false;
    renderBanner();
    await waitFor(() => expect(getOrgParentMock).toHaveBeenCalled());
    expect(screen.queryByTestId("report-reminder-banner")).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("historique non lu → aucune bannière (R52 : « pas encore lu » ≠ « vide »)", async () => {
    loadedValue = false;
    renderBanner();
    await waitFor(() => expect(getOrgParentMock).toHaveBeenCalled());
    expect(screen.queryByTestId("report-reminder-banner")).toBeNull();
  });

  it("org RACINE (sans mère) → aucune bannière (rien à envoyer)", async () => {
    getOrgParentMock.mockResolvedValue(null);
    renderBanner();
    await waitFor(() => expect(getOrgParentMock).toHaveBeenCalled());
    expect(screen.queryByTestId("report-reminder-banner")).toBeNull();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("fermeture du jour → la bannière disparaît et le marqueur est posé", async () => {
    renderBanner();
    const banner = await screen.findByTestId("report-reminder-banner");
    const close = banner.querySelector('button[aria-label="Masquer le rappel pour aujourd\'hui"]');
    expect(close).not.toBeNull();
    fireEvent.click(close!);
    await waitFor(() =>
      expect(screen.queryByTestId("report-reminder-banner")).toBeNull(),
    );
    expect(localStorage.getItem(REMINDER_DISMISSED_KEY)).toBe(
      new Date().toISOString().slice(0, 10),
    );
  });

  it("le bouton « Envoyer maintenant » est présent (lien vers l'envoi)", async () => {
    renderBanner();
    await screen.findByTestId("report-reminder-banner");
    expect(screen.getByText("Envoyer maintenant")).toBeInTheDocument();
  });
});
