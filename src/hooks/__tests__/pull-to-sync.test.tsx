// @vitest-environment jsdom
/**
 * A7 — « tirer pour synchroniser » : le geste rend TOUJOURS la main.
 *
 * Le risque de ce genre de fonctionnalité n'est pas qu'elle échoue — c'est
 * qu'elle échoue en laissant un spinner ouvert, ce qui fige l'écran et donne
 * l'impression que l'application est plantée. Ces tests verrouillent les
 * quatre issues possibles :
 *
 *   1. base absente (PowerSync pas prêt) → message, geste terminé ;
 *   2. base prête et synchro qui aboutit → succès, geste terminé ;
 *   3. base prête mais synchro qui ÉCHOUE → message, geste terminé ;
 *   4. synchro qui ne répond JAMAIS → délai dépassé, geste terminé.
 *
 * NON-VACUITÉ : retirer le `complete()` du `finally` ⇒ les tests 3 et 4
 * échouent (le geste ne se termine jamais).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePullToSync, type SyncableDatabase } from "@/hooks/usePullToSync";

function refreshEvent() {
  const complete = vi.fn();
  return {
    complete,
    event: { detail: { complete } } as unknown as CustomEvent<{ complete: () => void }>,
  };
}

const readyDb = (impl: () => Promise<void>): SyncableDatabase => ({ waitForFirstSync: impl });

beforeEach(() => vi.clearAllMocks());

describe("usePullToSync", () => {
  it("base absente : message d'échec et geste TERMINÉ (pas de spinner figé)", async () => {
    const notify = vi.fn();
    const { result } = renderHook(() =>
      usePullToSync({ getDatabase: () => null, notify }),
    );
    const { event, complete } = refreshEvent();

    await act(async () => {
      await result.current.onIonRefresh(event);
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("non aboutie"), "error");
    expect(result.current.lastResult).toBe("error");
    expect(result.current.isOpen).toBe(false);
  });

  it("synchronisation réussie : succès annoncé et geste terminé", async () => {
    const notify = vi.fn();
    const waitForFirstSync = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      usePullToSync({ getDatabase: () => readyDb(waitForFirstSync), notify }),
    );
    const { event, complete } = refreshEvent();

    await act(async () => {
      await result.current.onIonRefresh(event);
    });

    expect(waitForFirstSync).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.current.lastResult).toBe("success");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("effectuée"), "success");
  });

  it("échec de synchronisation : signalé, jamais avalé, geste terminé", async () => {
    const notify = vi.fn();
    const { result } = renderHook(() =>
      usePullToSync({
        getDatabase: () => readyDb(async () => Promise.reject(new Error("réseau"))),
        notify,
      }),
    );
    const { event, complete } = refreshEvent();

    await act(async () => {
      await result.current.onIonRefresh(event);
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(result.current.lastResult).toBe("error");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("non aboutie"), "error");
  });

  it("synchronisation qui ne répond jamais : le délai rend la main", async () => {
    vi.useFakeTimers();
    try {
      const notify = vi.fn();
      const { result } = renderHook(() =>
        usePullToSync({
          getDatabase: () => readyDb(() => new Promise<void>(() => undefined)),
          timeoutMs: 1_000,
          notify,
        }),
      );
      const { event, complete } = refreshEvent();

      let done: Promise<void>;
      await act(async () => {
        done = result.current.onIonRefresh(event);
        vi.advanceTimersByTime(1_500);
        await done;
      });

      expect(complete).toHaveBeenCalledTimes(1);
      expect(result.current.lastResult).toBe("error");
      expect(notify).toHaveBeenCalledWith(expect.stringContaining("non aboutie"), "error");
    } finally {
      vi.useRealTimers();
    }
  });

  it("deux gestes simultanés : un seul cycle de synchronisation", async () => {
    let resolveSync: (() => void) | null = null;
    const waitForFirstSync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve;
        }),
    );
    const { result } = renderHook(() =>
      usePullToSync({ getDatabase: () => readyDb(waitForFirstSync) }),
    );

    const first = refreshEvent();
    const second = refreshEvent();

    let pending: Promise<void>;
    await act(async () => {
      pending = result.current.onIonRefresh(first.event);
      // Second geste pendant que le premier attend encore.
      await result.current.onIonRefresh(second.event);
    });

    // Le second geste est refermé immédiatement, sans lancer d'attente.
    expect(second.complete).toHaveBeenCalledTimes(1);
    expect(waitForFirstSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync?.();
      await pending;
    });
    expect(first.complete).toHaveBeenCalledTimes(1);
  });
});
