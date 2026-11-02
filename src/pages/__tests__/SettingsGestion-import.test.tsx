// @vitest-environment jsdom
/**
 * PR2 — câblage UI de « Importer une sauvegarde » (`/settings/gestion`).
 *
 * Défauts verrouillés :
 *   1. R52 — tant que la réplique n'est pas lue (`ready === false`), l'import
 *      affiche « Chargement des données… » et NE propose AUCUN bouton de choix
 *      de fichier (la comparaison serait faite sur un état faux).
 *   2. RBAC — l'import n'est monté que si `admin:settings` est accordé ; un
 *      rôle sans droit ne voit AUCUNE affordance d'import.
 *   3. Un fichier valide affiche le RÉSUMÉ du plan (créations / mises à jour /
 *      conflits) et n'écrit RIEN tant que « Restaurer » n'est pas cliqué.
 *   4. À la confirmation, la restauration est appliquée ET le writer reçoit le
 *      libellé de la source (l'entrée d'audit `RESTORE` est écrite par le
 *      writer lui-même — cf. `backup-restore.test.ts`), puis un toast
 *      récapitulatif est affiché.
 *   5. Un fichier d'une AUTRE organisation est REFUSÉ (anti-fuite inter-org) :
 *      aucun plan, aucun bouton d'application, aucune écriture.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - retirer le garde RBAC `canManageSettings.allowed` autour du bloc d'import
 *     ⇒ le test « rôle sans droit » échoue ;
 *   - retirer le bornage d'org (`planRestore` ORG_MISMATCH) ⇒ le test « fichier
 *     d'une autre organisation refusé » échoue ;
 *   - appeler `restoreBackupRows` avant la confirmation ⇒ le test « aucune
 *     écriture avant confirmation » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const restoreBackupRows = vi.fn();
const recordUsage = vi.fn();
const captureClientError = vi.fn();
const toast = vi.fn();

const backupState = {
  ready: true,
  counts: { transactions: 0 },
  total: 0,
  // Enveloppe de l'organisation ACTIVE (org-1), vide : tout élément importé est
  // donc une CRÉATION.
  buildBundle: vi.fn(() => ({
    format: "lumina-backup",
    version: 1,
    exportedAt: "2026-10-31T08:00:00.000Z",
    orgId: "org-1",
    counts: {},
    data: {} as Record<string, unknown[]>,
  })),
};

const accessState = { allowed: true };

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

vi.mock("@/lib/download", () => ({ downloadBlob: vi.fn() }));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: (...args: unknown[]) => captureClientError(...args),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/PeriodLockCard", () => ({ default: () => null }));

vi.mock("@/components/CsvImportPanel", () => ({ default: () => null }));

vi.mock("@/hooks/useMakerChecker", () => ({
  useMakerChecker: () => ({ enabled: false, loaded: true }),
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({
    allowed: accessState.allowed,
    canAccess: accessState.allowed,
    loading: false,
    source: "test",
  }),
}));

vi.mock("@/lib/backupRestore", () => ({
  restoreBackupRows: (...args: unknown[]) => restoreBackupRows(...args),
}));

vi.mock("@/lib/usageStats", () => ({
  recordUsage: (...args: unknown[]) => recordUsage(...args),
}));

import SettingsGestion from "@/pages/SettingsGestion";

beforeEach(() => {
  restoreBackupRows.mockReset();
  restoreBackupRows.mockResolvedValue({ written: 1, created: 1, updated: 0 });
  recordUsage.mockClear();
  captureClientError.mockClear();
  toast.mockClear();
  backupState.ready = true;
  accessState.allowed = true;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsGestion />
    </MemoryRouter>,
  );
}

function makeFile(name: string, content: string): File {
  const file = new File([content], name, { type: "application/json" });
  if (typeof file.text !== "function") {
    (file as unknown as { text: () => Promise<string> }).text = async () => content;
  }
  return file;
}

function selectFile(content: string) {
  const input = screen.getByTestId("backup-import-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [makeFile("sauvegarde.json", content)] } });
}

function backupText(orgId: string, data: Record<string, unknown[]>) {
  return JSON.stringify({
    format: "lumina-backup",
    version: 1,
    exportedAt: "2026-10-31T08:00:00.000Z",
    orgId,
    counts: {},
    data,
  });
}

afterEach(cleanup);

describe("SettingsGestion — import (R52 : pas d'import avant lecture)", () => {
  it("affiche un squelette et aucune affordance d'import quand la réplique n'est pas lue", () => {
    backupState.ready = false;
    renderPage();

    expect(screen.getByTestId("backup-import-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("backup-import-choose")).toBeNull();
  });
});

describe("SettingsGestion — import (RBAC)", () => {
  it("ne monte l'import que si la permission d'administration est accordée", () => {
    accessState.allowed = false;
    renderPage();
    expect(screen.queryByTestId("backup-import")).toBeNull();
  });
});

describe("SettingsGestion — plan de restauration", () => {
  it("affiche le résumé du plan et n'écrit RIEN avant confirmation", async () => {
    renderPage();
    selectFile(
      backupText("org-1", {
        transactions: [{ id: "t1", org_id: "org-1" }],
        members: [{ id: "m1", org_id: "org-1" }],
      }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("backup-import-plan")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/2 création\(s\), 0 mise\(s\) à jour, 0 conflit\(s\)/),
    ).toBeInTheDocument();
    // Aucune écriture tant que l'utilisateur n'a pas confirmé.
    expect(restoreBackupRows).not.toHaveBeenCalled();
  });

  it("applique le plan, transmet la source au writer et affiche un toast", async () => {
    renderPage();
    selectFile(
      backupText("org-1", { transactions: [{ id: "t1", org_id: "org-1" }] }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("backup-import-confirm")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("backup-import-confirm"));

    await waitFor(() => expect(restoreBackupRows).toHaveBeenCalledTimes(1));

    // L'audit `RESTORE` est écrit par le writer lui-même : la page lui transmet
    // seulement le libellé de la source (cf. `backup-restore.test.ts`).
    const [, options] = restoreBackupRows.mock.calls[0] as [
      unknown,
      { sourceLabel?: string },
    ];
    expect(options?.sourceLabel).toBeTruthy();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sauvegarde restaurée" }),
    );
  });

  it("refuse un fichier d'une autre organisation (anti-fuite inter-org)", async () => {
    renderPage();
    selectFile(
      backupText("org-2", { transactions: [{ id: "t9", org_id: "org-2" }] }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("backup-import-rejected")).toBeInTheDocument(),
    );
    expect(screen.getByText(/autre organisation/)).toBeInTheDocument();
    expect(screen.queryByTestId("backup-import-confirm")).toBeNull();
    expect(restoreBackupRows).not.toHaveBeenCalled();
  });

  it("refuse un fichier au format inconnu avec un message explicite", async () => {
    renderPage();
    selectFile(JSON.stringify({ format: "autre", version: 1, orgId: "org-1", data: {} }));

    await waitFor(() =>
      expect(screen.getByTestId("backup-import-rejected")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Format inconnu/)).toBeInTheDocument();
    expect(screen.queryByTestId("backup-import-confirm")).toBeNull();
  });
});
