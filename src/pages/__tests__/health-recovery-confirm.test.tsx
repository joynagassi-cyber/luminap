// @vitest-environment jsdom
/**
 * A6 — « Réinitialiser les données locales » : confirmation Ionic, pas système.
 *
 * Défaut d'origine : `window.confirm()` dans `runRecovery`. Deux problèmes,
 * tous deux réels :
 *   1. un modulateur SYSTÈME bloque le thread JS — donc la synchronisation
 *      PowerSync en cours — tant que l'utilisateur n'a pas répondu ;
 *   2. il est impossible à styler, à traduire et à tester, et il ignore la
 *      règle « Ionic d'abord ».
 *
 * Ces tests verrouillent le contrat visible :
 *   - cliquer sur le bouton n'efface RIEN tant que la confirmation n'est pas
 *     donnée ;
 *   - annuler n'efface jamais ;
 *   - confirmer appelle bien la récupération ;
 *   - `window.confirm` n'est plus utilisé du tout.
 *
 * NON-VACUITÉ : remplacer `setConfirmRecovery(true)` par `void runRecovery()`
 * dans le onClick ⇒ le test « n'efface rien avant confirmation » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

/**
 * Les fabriques de `vi.mock` sont hissées au-dessus des imports : elles ne
 * peuvent PAS capturer les variables `vi` du module (d'où `vi.fn` dans
 * `vi.hoisted`). `vi.hoisted` reçoit une valeur de retour sérialisable : on y
 * construit donc les espions, pas un objet de configuration.
 */
const hoisted = vi.hoisted(() => {
  const performLocalRecovery = async () => undefined;
  return { performLocalRecovery: vi.fn(performLocalRecovery), confirmSpy: vi.fn(() => true) };
});

/**
 * `lucide-react` exporte des centaines d'icônes : on part du module RÉEL et on
 * remplace chaque export par un composant vide. Pas de liste blanche à
 * maintenir quand la page ajoute une icône.
 */
vi.mock("lucide-react", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  const stub = Icon;
  const mocked: Record<string, unknown> = { ...actual };
  for (const key of Object.keys(actual)) mocked[key] = stub;
  return mocked;
});

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/clientErrors", async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  getRecentErrors: () => [],
  captureClientError: vi.fn(),
}));

// Le module `health` reste RÉEL (il calcule le rapport) : on rend seulement le
// drapeau PowerSync neutre pour éviter de tirer tout le data layer.
vi.mock("@/lib/dataLayer", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, isPowerSyncReadyNow: () => true };
});

vi.mock("@/lib/reportProblem", () => ({
  sendProblemReportToIssues: vi.fn(async () => ({ ok: true })),
  getLastProblemReport: () => null,
}));

vi.mock("@/lib/usageStats", () => ({
  getUsageStats: () => ({}),
  clearUsageStats: vi.fn(),
  isValidFeatureId: () => true,
}));

vi.mock("@/lib/localRecovery", () => ({
  performLocalRecovery: hoisted.performLocalRecovery,
}));

vi.mock("@/lib/powersync", () => ({
  disconnectPowerSync: vi.fn(async () => undefined),
  getDatabaseBootPlan: () => null,
}));

vi.mock("@/lib/deleteAllLocalData", () => ({ deleteAllLocalData: vi.fn(async () => undefined) }));
// Mock partiel : on part du module réel pour ne pas énumérer ses exports
// (la liste dérivait à chaque ajout et cassait le test pour de mauvaises raisons).
vi.mock("@/lib/orgContext", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resetOrganizationId: vi.fn(),
    getOrganizationId: () => "org-test",
  };
});

/** Ionic minimal : IonAlert rend titre/message/boutons quand `isOpen`. */
vi.mock("@ionic/react", () => ({
  IonAlert: ({
    isOpen,
    header,
    message,
    buttons = [],
    onDidDismiss,
  }: {
    isOpen?: boolean;
    header?: string;
    message?: string;
    buttons?: { text: string; handler?: () => unknown }[];
    onDidDismiss?: () => void;
  }) =>
    isOpen ? (
      <div role="alertdialog">
        <h2>{header}</h2>
        <p>{message}</p>
        {buttons.map((b) => (
          <button
            key={b.text}
            type="button"
            onClick={() => {
              const result = b.handler?.();
              if (result !== false) onDidDismiss?.();
            }}
          >
            {b.text}
          </button>
        ))}
      </div>
    ) : null,
}));

import Health from "@/pages/Health";

/** Icône : `undefined` casserait le rendu ; `null` est un composant valide. */
function Icon() {
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockImplementation(hoisted.confirmSpy);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("A6 — confirmation de la récupération locale", () => {
  it("cliquer sur le bouton n'efface rien avant confirmation", async () => {
    render(<Health />);
    fireEvent.click(await screen.findByTestId("health.local-recovery"));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(hoisted.performLocalRecovery).not.toHaveBeenCalled();
  });

  it("annuler n'appelle jamais la récupération", async () => {
    render(<Health />);
    fireEvent.click(await screen.findByTestId("health.local-recovery"));
    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));

    expect(hoisted.performLocalRecovery).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("confirmer déclenche la récupération", async () => {
    render(<Health />);
    fireEvent.click(await screen.findByTestId("health.local-recovery"));
    fireEvent.click(await screen.findByRole("button", { name: "Réinitialiser" }));

    await waitFor(() => expect(hoisted.performLocalRecovery).toHaveBeenCalledTimes(1));
  });

  it("n'utilise plus window.confirm (modulateur système bloquant)", async () => {
    render(<Health />);
    fireEvent.click(await screen.findByTestId("health.local-recovery"));
    fireEvent.click(await screen.findByRole("button", { name: "Réinitialiser" }));

    await waitFor(() => expect(hoisted.performLocalRecovery).toHaveBeenCalled());
    expect(hoisted.confirmSpy).not.toHaveBeenCalled();
  });
});
