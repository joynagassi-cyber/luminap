// @vitest-environment jsdom
/**
 * Indicateur de synchronisation — pre-mortem PM19.
 *
 * Défaut visé : une mutation en file dont l'envoi échoue (uploadError) restait
 * SILENCIEUSE — l'erreur n'était que `console.debug` et l'indicateur affichait
 * « sync HH:MM » comme si tout allait bien. L'utilisateur pouvait quitter en
 * croyant sa saisie enregistrée alors qu'elle n'était jamais partie.
 *
 * Preuve : `usePowerSyncIndicator` expose `syncError` (upload OU download) et
 * l'état neutre reste `syncError: null` quand il n'y a pas d'erreur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const dbMock = vi.hoisted(() => {
  let current: Record<string, unknown> = {};
  const handlers = new Set<() => void>();
  return {
    setStatus(s: Record<string, unknown>) {
      current = s;
      handlers.forEach((h) => h());
    },
    db: {
      get currentStatus() {
        return current;
      },
      on: (_e: string, h: () => void) => handlers.add(h),
      off: (_e: string, h: () => void) => handlers.delete(h),
    },
    reset() {
      current = {};
      handlers.clear();
    },
  };
});

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => dbMock.db,
}));

vi.mock("@/lib/auth", () => ({
  authService: { subscribe: () => () => {} },
}));

import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";

describe("usePowerSyncIndicator — erreur de sync visible (PM19)", () => {
  beforeEach(() => {
    dbMock.reset();
    cleanup();
  });

  it("expose l'erreur d'UPLOAD (mutation jamais envoyée)", async () => {
    dbMock.setStatus({
      connected: true,
      lastSyncedAt: new Date(),
      uploading: false,
      downloadError: null,
      uploadError: { message: "FOREIGN KEY constraint failed" },
    });
    const { result } = renderHook(() => usePowerSyncIndicator());
    await waitFor(() =>
      expect(result.current.syncError).toBe("FOREIGN KEY constraint failed"),
    );
  });

  it("expose l'erreur de DOWNLOAD", async () => {
    dbMock.setStatus({
      connected: true,
      uploading: false,
      uploadError: null,
      downloadError: { message: "PSYNC_S2305: stream not found" },
    });
    const { result } = renderHook(() => usePowerSyncIndicator());
    await waitFor(() =>
      expect(result.current.syncError).toBe("PSYNC_S2305: stream not found"),
    );
  });

  it("syncError = null quand tout va bien", async () => {
    dbMock.setStatus({
      connected: true,
      lastSyncedAt: new Date(),
      uploading: false,
      uploadError: null,
      downloadError: null,
    });
    const { result } = renderHook(() => usePowerSyncIndicator());
    await waitFor(() => expect(result.current.online).toBe(true));
    expect(result.current.syncError).toBeNull();
  });
});
