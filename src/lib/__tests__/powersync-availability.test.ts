// @vitest-environment jsdom
/**
 * P0 — machine d'état de disponibilité PowerSync.
 *
 * Vérifie le filet de sécurité « zéro écran muet » au niveau du module ET des
 * hooks :
 *  - une réplique qui devient prête annule l'état « indisponible » ;
 *  - l'état « indisponible » notifie ses abonnés (une seule fois) ;
 *  - `useReplicaUnavailable` REFERME la bannière après rétablissement, sans
 *    remontage du composant ;
 *  - `usePowerSyncStatus` ne déclare PAS « indisponible » quand la connexion
 *    est établie mais que la 1re synchronisation est encore en cours.
 *
 * Non-vacuité (retirer le correctif ⇒ rouge) :
 *  - « redevenir prêt notifie les abonnés » échoue si `setPowerSyncReady` ne
 *    notifie pas quand `_psReady` était déjà `true` ;
 *  - « la bannière se referme » échoue si le hook ne s'abonne pas à
 *    « redevenu disponible » (l'ancien listener forçait `true`) ;
 *  - « connexion établie … ne déclenche PAS » échoue si la borne de 30 s ne
 *    consulte pas `connected`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

// `usePowerSync` est piloté par ce détenteur hoisté : la borne de disponibilité
// de `usePowerSyncStatus` lit `sync.currentStatus`.
const ps = vi.hoisted(() => ({ sync: null as any }));
vi.mock("@powersync/react", () => ({
  usePowerSync: () => ps.sync,
  useQuery: () => ({ rows: [] }),
  PowerSyncProvider: ({ children }: any) => children,
}));

import {
  markPowerSyncReady,
  markPowerSyncUnavailable,
  setPowerSyncReady,
  isPowerSyncReadyNow,
  isPowerSyncUnavailableNow,
  subscribePowerSyncUnavailable,
  useReplicaUnavailable,
  usePowerSyncStatus,
} from "@/lib/dataLayer";

/** Remet la machine d'état dans un état neutre (non prêt, non indisponible). */
function resetReadiness() {
  setPowerSyncReady(true); // annule _psUnavailable
  setPowerSyncReady(false); // _psReady = false
}

describe("disponibilité PowerSync (P0)", () => {
  beforeEach(resetReadiness);

  it("une réplique prête annule l'état indisponible", () => {
    markPowerSyncUnavailable();
    expect(isPowerSyncUnavailableNow()).toBe(true);
    markPowerSyncReady();
    expect(isPowerSyncReadyNow()).toBe(true);
    expect(isPowerSyncUnavailableNow()).toBe(false);
  });

  it("l'état indisponible notifie ses abonnés une seule fois", () => {
    const listener = vi.fn();
    const unsub = subscribePowerSyncUnavailable(listener);
    markPowerSyncUnavailable();
    markPowerSyncUnavailable();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("redevenir prêt notifie les abonnés « indisponible » même si la réplique était déjà prête", () => {
    markPowerSyncReady(); // réplique déjà prête (cas réel : sync fonctionnait)
    markPowerSyncUnavailable();
    expect(isPowerSyncUnavailableNow()).toBe(true);

    const listener = vi.fn();
    const unsub = subscribePowerSyncUnavailable(listener);
    // Ici `_psReady` est DÉJÀ `true` : seule la disponibilité bascule.
    markPowerSyncReady();
    expect(isPowerSyncUnavailableNow()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });
});

describe("useReplicaUnavailable — la bannière se referme au rétablissement", () => {
  beforeEach(resetReadiness);
  afterEach(cleanup);

  it("disparaît après markPowerSyncReady() sans remontage du composant", () => {
    const { result } = renderHook(() => useReplicaUnavailable());
    expect(result.current).toBe(false);

    act(() => markPowerSyncUnavailable());
    expect(result.current).toBe(true); // bannière affichée

    act(() => markPowerSyncReady());
    expect(result.current).toBe(false); // bannière refermée, même instance
  });
});

describe("usePowerSyncStatus — borne de disponibilité (P0)", () => {
  beforeEach(() => {
    resetReadiness();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    ps.sync = null;
  });

  it("connexion établie mais hasSynced=false au-delà du délai ne déclenche PAS l'indisponibilité", () => {
    ps.sync = {
      currentStatus: { connected: true, hasSynced: false },
      registerListener: () => () => {},
    };
    renderHook(() => usePowerSyncStatus());
    act(() => {
      vi.advanceTimersByTime(30_001);
    });
    expect(isPowerSyncUnavailableNow()).toBe(false);
  });

  it("hasSynced=true HORS LIGNE (connected=false) rend la réplique PRÊTE", () => {
    // Cœur du correctif hors ligne : `hasSynced` est persisté en base, donc
    // vrai dès qu'une synchro a eu lieu, même au boot suivant sans réseau.
    // Exiger `connected` gardait la porte fermée et l'app sur squelettes.
    ps.sync = {
      currentStatus: { connected: false, hasSynced: true },
      registerListener: () => () => {},
    };
    renderHook(() => usePowerSyncStatus());
    expect(isPowerSyncReadyNow()).toBe(true);
    // …et la borne de disponibilité ne déclare donc PAS l'indisponibilité.
    act(() => {
      vi.advanceTimersByTime(30_001);
    });
    expect(isPowerSyncUnavailableNow()).toBe(false);
  });

  it("une absence de connexion durable déclenche bien l'indisponibilité", () => {
    ps.sync = {
      currentStatus: { connected: false, hasSynced: false },
      registerListener: () => () => {},
    };
    renderHook(() => usePowerSyncStatus());
    act(() => {
      vi.advanceTimersByTime(30_001);
    });
    expect(isPowerSyncUnavailableNow()).toBe(true);
  });
});
