// @vitest-environment jsdom
/**
 * P0 « zéro écran muet » — filet de sécurité de disponibilité PowerSync.
 *
 * Les pages gardent leur contenu réel derrière `isPowerSyncReadyNow()` (R52,
 * voulu). Si la réplique n'est JAMAIS prête (jeton refusé par le service,
 * réseau coupé), l'utilisateur reste sur un squelette perpétuel muet. Le
 * mécanisme `markPowerSyncUnavailable` + `SyncUnavailableBanner` fournit un
 * état explicite et une action.
 *
 * Non-vacuité : sans la bannière (ou sans le basculement), l'assertion échoue.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  unavailable: { value: false },
  markPowerSyncReady: vi.fn(),
}));

vi.mock("@/lib/dataLayer", () => ({
  useReplicaUnavailable: () => mocks.unavailable.value,
  markPowerSyncReady: mocks.markPowerSyncReady,
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ connect: vi.fn(async () => undefined) }),
  getPowerSyncConnector: () => ({}),
}));

import { SyncUnavailableBanner } from "@/components/SyncUnavailableBanner";

describe("SyncUnavailableBanner (P0 zéro écran muet)", () => {
  beforeEach(() => {
    cleanup();
    mocks.unavailable.value = false;
    mocks.markPowerSyncReady.mockClear();
  });

  it("n'affiche rien tant que la réplique est disponible", () => {
    render(<SyncUnavailableBanner />);
    expect(screen.queryByText(/Synchronisation indisponible/i)).toBeNull();
    expect(document.querySelector('[data-sync-unavailable="true"]')).toBeNull();
  });

  it("affiche un état explicite + une action quand la réplique est indisponible", () => {
    mocks.unavailable.value = true;
    render(<SyncUnavailableBanner />);
    expect(screen.getByText(/Synchronisation indisponible/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
    expect(document.querySelector('[data-sync-unavailable="true"]')).not.toBeNull();
  });

  it("« Réessayer » relie une reconnexion réussie à markPowerSyncReady (bannière levée)", async () => {
    mocks.unavailable.value = true;
    render(<SyncUnavailableBanner />);
    fireEvent.click(screen.getByRole("button", { name: /Réessayer/i }));
    await waitFor(() => expect(mocks.markPowerSyncReady).toHaveBeenCalledTimes(1));
  });
});
