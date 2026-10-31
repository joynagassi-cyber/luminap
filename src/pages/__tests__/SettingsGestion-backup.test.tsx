// @vitest-environment jsdom
/**
 * PR2 — câblage UI de « Sauvegarde des données » (`/settings/gestion`).
 *
 * Défauts verrouillés :
 *   1. R52 — tant que la réplique n'est pas lue (`ready === false`), l'écran
 *      affiche « Chargement des données… » et NE montre JAMAIS un compte
 *      « 0 élément » (fait faux) ; les boutons d'export sont désactivés.
 *   2. Cliquer « Exporter mes données (JSON) » déclenche le téléchargement
 *      (Blob + `downloadBlob`) d'un JSON contenant l'enveloppe de sauvegarde.
 *   3. Cliquer « Exporter (CSV) » télécharge un CSV dont les formules sont
 *      neutralisées (apostrophe de tête).
 *   4. Une erreur d'export est capturée (`captureClientError`) et signalée par
 *      un toast d'échec — jamais avalée.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : remplacer le garde
 * `{!backup.ready ? … }` par un rendu direct du compte ⇒ le test « pas de
 * verdict 0 avant lecture » échoue. Retirer l'appel `downloadBlob` ⇒ les tests
 * de téléchargement échouent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const downloadBlob = vi.fn();
const captureClientError = vi.fn();
const toast = vi.fn();

// Enveloppe de sauvegarde renvoyée par le hook (forme réelle de BackupBundle).
const bundle = {
  format: "lumina-backup",
  version: 1,
  exportedAt: "2026-10-31T08:00:00.000Z",
  orgId: "org-1",
  counts: { transactions: 1 },
  data: { transactions: [{ id: "t1", description: "=1+1" }] },
};

const backupState = {
  ready: true,
  counts: { transactions: 1 },
  total: 1,
  buildBundle: vi.fn(() => bundle),
};

vi.mock("@/hooks/useBackupData", () => ({
  useBackupData: () => backupState,
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "u-1",
    role: "ADMIN",
    org: { id: "org-1", name: "Lumina", type: "Église" },
  }),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: (s: unknown) => unknown) =>
    sel({ loadInitialData: vi.fn(async () => undefined) }),
}));

vi.mock("@/lib/download", () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: (...args: unknown[]) => captureClientError(...args),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// PR13 — le contrôle du gel de période est testé à part
// (`components/__tests__/PeriodLockCard.test.tsx`). On l'isole ici : ce test
// porte sur la sauvegarde, et le composant lit ses propres données.
vi.mock("@/components/PeriodLockCard", () => ({
  default: () => null,
}));

vi.mock("@/hooks/useMakerChecker", () => ({
  useMakerChecker: () => ({ enabled: false, loaded: true }),
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({ allowed: false, canAccess: false, loading: false, source: "test" }),
}));

import SettingsGestion from "@/pages/SettingsGestion";

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsGestion />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  downloadBlob.mockClear();
  captureClientError.mockClear();
  toast.mockClear();
  backupState.ready = true;
  backupState.buildBundle = vi.fn(() => bundle);
});

afterEach(cleanup);

describe("SettingsGestion — sauvegarde (R52 : pas de verdict 0 avant lecture)", () => {
  it("affiche un squelette et aucun compte quand la réplique n'est pas lue", () => {
    backupState.ready = false;
    renderPage();

    expect(screen.getByTestId("backup-pending")).toBeInTheDocument();
    expect(screen.queryByText(/0 élément/)).toBeNull();
    expect(
      (screen.getByTestId("backup-export-json") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("backup-export-csv") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("affiche le compte réel et des boutons actifs quand la réplique est lue", () => {
    backupState.ready = true;
    renderPage();

    expect(screen.queryByTestId("backup-pending")).toBeNull();
    expect(screen.getByText(/1 élément\(s\)/)).toBeInTheDocument();
    expect(
      (screen.getByTestId("backup-export-json") as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});

describe("SettingsGestion — export JSON / CSV", () => {
  it("télécharge un JSON contenant l'enveloppe de sauvegarde", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("backup-export-json"));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    const [blob, filename] = downloadBlob.mock.calls[0];
    expect(filename).toBe("lumina-sauvegarde-2026-10-31.json");
    const text = await (blob as Blob).text();
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe("lumina-backup");
    expect(parsed.data.transactions[0].id).toBe("t1");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sauvegarde téléchargée" }),
    );
  });

  it("télécharge un CSV dont les formules sont neutralisées", async () => {
    renderPage();
    fireEvent.click(screen.getByTestId("backup-export-csv"));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    const [blob, filename] = downloadBlob.mock.calls[0];
    expect(filename).toBe("lumina-sauvegarde-2026-10-31.csv");
    const text = await (blob as Blob).text();
    expect(text).toContain("'=1+1");
    expect(text).not.toMatch(/(^|;)=1\+1/);
  });

  it("capture l'erreur et signale l'échec si l'export lève", async () => {
    backupState.buildBundle = vi.fn(() => {
      throw new Error("boom");
    });
    renderPage();
    fireEvent.click(screen.getByTestId("backup-export-json"));

    await waitFor(() => expect(captureClientError).toHaveBeenCalledTimes(1));
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Échec de la sauvegarde",
        variant: "destructive",
      }),
    );
  });
});
