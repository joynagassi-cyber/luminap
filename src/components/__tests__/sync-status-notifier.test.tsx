// @vitest-environment jsdom
/**
 * Remplacement du bandeau persistant « Synchronisation indisponible »
 * (demande produit) : plus d'élément fixe à l'écran, l'utilisateur est
 * NOTIFIÉ (toast) quand la synchronisation n'est pas faite — une fois
 * par épisode — et quand des écritures sont rejetées définitivement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  unavailable: { value: false },
  indicator: { value: { online: true, lastSyncAt: null, syncing: false, syncError: null as string | null } },
  toastWarning: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/dataLayer", () => ({
  useReplicaUnavailable: () => mocks.unavailable.value,
}));

vi.mock("@/lib/hooks/usePowerSyncIndicator", () => ({
  usePowerSyncIndicator: () => mocks.indicator.value,
}));

vi.mock("sonner", () => ({
  toast: { warning: mocks.toastWarning, error: mocks.toastError },
}));

import { SyncStatusNotifier } from "@/components/SyncStatusNotifier";
import {
  recordRejectedSyncOp,
  clearRejectedSyncOps,
} from "@/lib/powersync/syncRejectedOps";

function renderNotifier(route = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <SyncStatusNotifier />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  clearRejectedSyncOps();
  mocks.unavailable.value = false;
  mocks.indicator.value = { online: true, lastSyncAt: null, syncing: false, syncError: null };
  mocks.toastWarning.mockClear();
  mocks.toastError.mockClear();
});

describe("SyncStatusNotifier — notification au lieu du bandeau", () => {
  it("ne rend RIEN à l'écran (aucun bandeau)", () => {
    mocks.unavailable.value = true;
    const { container } = renderNotifier();
    expect(container).toBeEmptyDOMElement();
  });

  it("toast UNE fois par épisode d'échec, réarmé après retour à la normale", () => {
    const { rerender } = renderNotifier();
    expect(mocks.toastWarning).not.toHaveBeenCalled();

    mocks.unavailable.value = true;
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SyncStatusNotifier />
      </MemoryRouter>,
    );
    expect(mocks.toastWarning).toHaveBeenCalledTimes(1);
    expect(mocks.toastWarning.mock.calls[0][0]).toContain(
      "Synchronisation non effectuée",
    );

    // Toujours en échec → pas de second toast.
    mocks.indicator.value = { ...mocks.indicator.value, syncError: "boom" };
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SyncStatusNotifier />
      </MemoryRouter>,
    );
    expect(mocks.toastWarning).toHaveBeenCalledTimes(1);

    // Retour à la normale puis nouvel échec → nouveau toast.
    mocks.unavailable.value = false;
    mocks.indicator.value = { ...mocks.indicator.value, syncError: null };
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SyncStatusNotifier />
      </MemoryRouter>,
    );
    mocks.indicator.value = { ...mocks.indicator.value, syncError: "boom2" };
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <SyncStatusNotifier />
      </MemoryRouter>,
    );
    expect(mocks.toastWarning).toHaveBeenCalledTimes(2);
  });

  it("silencieux sur les écrans publics (/auth)", () => {
    mocks.unavailable.value = true;
    renderNotifier("/auth");
    expect(mocks.toastWarning).not.toHaveBeenCalled();
  });

  it("notifie les rejets définitifs serveur (journal B-02), une seule fois par lot", async () => {
    renderNotifier();
    await act(async () => {
      recordRejectedSyncOp({
        table: "transactions",
        op: "PUT",
        id: "tx-1",
        code: "42501",
        message: "rls",
      });
    });
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.toastError.mock.calls[0][0]).toContain("rejetées par le serveur");

    // Un second rejet → nouvelle notification.
    await act(async () => {
      recordRejectedSyncOp({
        table: "members",
        op: "PUT",
        id: "m-1",
        code: "23502",
        message: "not null",
      });
    });
    expect(mocks.toastError).toHaveBeenCalledTimes(2);
  });

  it("ne re-notifie pas les anciens rejets au remontage (filigrane persisté)", async () => {
    const first = renderNotifier();
    await act(async () => {
      recordRejectedSyncOp({
        table: "t",
        op: "PUT",
        id: "x",
        code: "42501",
        message: "rls",
      });
    });
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    first.unmount();

    renderNotifier();
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
  });
});
