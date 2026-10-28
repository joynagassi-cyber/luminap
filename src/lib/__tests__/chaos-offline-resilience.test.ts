// @vitest-environment jsdom
/**
 * Phase 11 §5.4 — « catalogue de chaos » : résilience hors-ligne / stockage.
 *
 * Objectif : exercer des scénarios de panne réels (stockage corrompu, changement
 * de compte, droit révoqué hors-ligne, mutation rejouée, offline long) sur le
 * VRAI chemin de code, en ne mockant que les frontières de plateforme :
 *   - le TRANSPORT réseau Supabase (`@supabase/supabase-js`) ;
 *   - le worker SQLite/WASM PowerSync (`@/lib/powersync`, non instanciable en
 *     jsdom sans WASM) ;
 *   - l'auth (singleton Supabase, non montable hors navigateur) ;
 *   - le store Zustand (side-effect de rendu, sans rapport avec la logique).
 *
 * La logique testée (normalisation jsonb, purge multi-compte, garde FATAL du
 * connecteur d'upload, indicateur de sync) est exécutée telle quelle.
 *
 * NON-VACUITÉ (mutation, cf. receipt) : le scénario « droit révoqué hors-ligne »
 * a été temporairement affaibli (assertion inversée → le test échoue → restauré).
 * Le journal du run rouge est reproduit dans le receipt de la Phase 11.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, act } from "@testing-library/react";
import type { CrudEntry } from "@powersync/web";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks de FRONTIÈRE (hoisted : les factories `vi.mock` sont remontées).
// ─────────────────────────────────────────────────────────────────────────────

/** Client Supabase factice : enregistre les upserts, `error` programmable. */
const sb = vi.hoisted(() => {
  const calls: Array<{
    table: string;
    record: Record<string, unknown>;
    opts: { onConflict?: string } | undefined;
  }> = [];
  const state: { error: { message: string; code?: string } | null } = {
    error: null,
  };
  const client = {
    auth: {
      storageKey: undefined as string | undefined,
      getSession: async () => ({ data: { session: null } }),
      setSession: async () => ({ data: { session: null }, error: null }),
    },
    from(table: string) {
      return {
        upsert: async (
          record: Record<string, unknown>,
          opts: { onConflict?: string },
        ) => {
          calls.push({ table, record, opts });
          return state;
        },
        update: () => ({ eq: async () => state }),
        delete: () => ({ eq: async () => state }),
      };
    },
  };
  return { client, calls, state };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => sb.client,
}));

/** Handle PowerSync factice : `currentStatus` mutable + émission d'événement. */
const ps = vi.hoisted(() => {
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
      on: (_e: string, h: () => void) => {
        handlers.add(h);
      },
      off: (_e: string, h: () => void) => {
        handlers.delete(h);
      },
    },
    reset() {
      current = {};
      handlers.clear();
    },
  };
});

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ps.db,
  getPowerSyncConnector: () => ({}),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
}));

vi.mock("@/lib/auth", () => ({
  authService: {
    subscribe: () => () => {},
    getState: () => ({ profile: null }),
  },
  supabase: {},
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: { setState: vi.fn(), getState: () => ({}) },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Imports du VRAI code (après les mocks).
// ─────────────────────────────────────────────────────────────────────────────

import { parseJsonbValue } from "@/lib/jsonb";
import { loadOnboardingState, defaultOnboardingState } from "@/lib/onboardingState";
import { getStoredThemeId, persistThemeId } from "@/ionic/themes";
import { ensureLocalDataOwnedBy, useAppConfig } from "@/lib/dataLayer";
import {
  getOrganizationId,
  setOrganizationId,
  hasResolvedOrganization,
} from "@/lib/orgContext";
import { SupabaseConnector } from "@/lib/powersync/SupabaseConnector";
import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";

/**
 * Fabrique une op CRUD PowerSync minimale (le connecteur ne lit que
 * `table`, `op`, `id` et `opData`). Le cast est nécessaire : on ne veut PAS
 * instancier le vrai `CrudEntry` (qui exige le worker WASM), seulement lui
 * présenter la même surface que celle consommée par `pushCrudTransaction`.
 */
function crudOp(op: {
  table: string;
  op: "PUT" | "PATCH" | "DELETE";
  id: string;
  opData: Record<string, unknown>;
}): CrudEntry {
  return op as unknown as CrudEntry;
}

/** Transaction CRUD factice (le connecteur n'utilise que `crud` + `complete`). */
function crudTx(crud: CrudEntry[]) {
  return { complete: vi.fn(async () => {}), crud };
}

beforeEach(() => {
  localStorage.clear();
  sb.calls.length = 0;
  sb.state.error = null;
  ps.reset();
  vi.stubEnv("VITE_SUPABASE_URL", "https://unit.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "unit-anon-key");
  vi.stubEnv("VITE_POWERSYNC_URL", "https://unit.powersync.example.com");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Base locale corrompue — dégradation contrôlée (pas d'écran noir).
// ─────────────────────────────────────────────────────────────────────────────
describe("chaos 1 — stockage local corrompu : dégradation contrôlée", () => {
  it("parseJsonbValue : une chaîne non-JSON ne lève pas et renvoie le repli", () => {
    // Valeur illisible (JSON tronqué) là où un tableau est attendu.
    expect(() => parseJsonbValue("[{", [])).not.toThrow();
    expect(parseJsonbValue("[{", [])).toEqual([]);
    // Objet là où un tableau est attendu → repli (sinon `.map()` planterait).
    expect(parseJsonbValue('{"a":1}', [])).toEqual([]);
  });

  it("loadOnboardingState : un JSON corrompu retombe sur l'état par défaut", () => {
    localStorage.setItem("lumina-onboarding", "{ceci n'est pas du json");
    expect(() => loadOnboardingState()).not.toThrow();
    expect(loadOnboardingState()).toEqual(defaultOnboardingState());
  });

  it("getStoredThemeId : un getItem qui lève renvoie null (pas d'exception)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError", "SecurityError");
    });
    expect(() => getStoredThemeId()).not.toThrow();
    expect(getStoredThemeId()).toBeNull();
  });

  it("persistThemeId : un setItem qui lève ne fait pas planter le boot", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    expect(() => persistThemeId("spirit")).not.toThrow();
  });

  it("[DÉFAUT DOCUMENTÉ] useAppConfig ne dégrade PAS : JSON corrompu → throw", () => {
    // DÉFAUT RÉEL (non corrigé ici, cf. receipt) : `useAppConfig` appelle
    // `JSON.parse(localStorage.getItem("lumina-config"))` SANS `try/catch`.
    // Un `lumina-config` corrompu (quota tronqué, écriture interrompue) fait
    // lever le hook → l'ErrorBoundary de la route remplace toute la page.
    // Ce test FIGE le comportement actuel pour rendre le défaut visible ; il
    // devra être inversé en `not.toThrow()` le jour du correctif.
    localStorage.setItem("lumina-config", "{pas du json");
    expect(() => renderHook(() => useAppConfig())).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Changement d'utilisateur — isolation des données locales (aspect non
//    couvert par `local-data-ownership.test.ts` : le contexte d'ORG en MÉMOIRE).
// ─────────────────────────────────────────────────────────────────────────────
describe("chaos 2 — changement d'utilisateur : org en mémoire isolée", () => {
  it("A → B : purge le stockage ET réinitialise l'organisation en mémoire", async () => {
    localStorage.setItem("lumina-local-owner", "user-a");
    localStorage.setItem("lumina-active-org", "org-a");
    setOrganizationId("org-a");
    expect(getOrganizationId()).toBe("org-a");

    const purged = await ensureLocalDataOwnedBy("user-b");

    expect(purged).toBe(true);
    expect(localStorage.getItem("lumina-local-owner")).toBe("user-b");
    // Le contexte d'organisation est une variable de module : purger le
    // stockage ne suffit pas, il faut aussi oublier l'org EN MÉMOIRE — sinon
    // B hériterait de l'org de A jusqu'au rechargement.
    expect(getOrganizationId()).not.toBe("org-a");
    expect(hasResolvedOrganization()).toBe(false);
    expect(localStorage.getItem("lumina-active-org")).toBeNull();
  });

  it("MÊME compte : no-op, l'organisation en mémoire est préservée", async () => {
    localStorage.setItem("lumina-local-owner", "user-a");
    setOrganizationId("org-a");

    const purged = await ensureLocalDataOwnedBy("user-a");

    expect(purged).toBe(false);
    expect(getOrganizationId()).toBe("org-a");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Droit révoqué hors-ligne — la mutation rejetée est JETÉE visiblement,
//    jamais appliquée silencieusement (garde FATAL du connecteur d'upload).
// ─────────────────────────────────────────────────────────────────────────────
describe("chaos 3 — droit révoqué hors-ligne : rejet FATAL visible", () => {
  const revokedOp = crudOp({
    table: "accounts",
    op: "PUT",
    id: "acc-1",
    opData: {
      name: "Caisse A",
      org_id: "org-1",
      owner_type: "GROUP",
      owner_id: "grp-1",
      currency: "XOF",
      status: "ACTIVE",
    },
  });

  it("42501 (RLS) : l'op est jetée, la transaction avance, l'erreur est journalisée", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sb.state.error = {
      message: "new row violates row-level security policy for table accounts",
      code: "42501",
    };
    const connector = new SupabaseConnector();
    const tx = crudTx([revokedOp]);

    // Ne doit PAS lever : une op FATAL est « discardée » (continue), pas
    // rejouée à l'infini (sinon la file d'upload resterait bloquée).
    await expect(connector.pushCrudTransaction(tx)).resolves.toBeUndefined();

    // La transaction est complétée → PowerSync avance (pas de blocage).
    expect(tx.complete).toHaveBeenCalledTimes(1);
    // L'échec est rendu VISIBLE (warn), pas avalé silencieusement.
    const logged = warn.mock.calls.map((c) => String(c[0]));
    expect(logged.some((m) => m.includes("FAILED") && m.includes("42501"))).toBe(true);
  });

  it("classe 23 (contrainte) : également FATAL → jetée + transaction complétée", async () => {
    sb.state.error = {
      message: "null value in column \"name\" violates not-null constraint",
      code: "23502",
    };
    const connector = new SupabaseConnector();
    const tx = crudTx([revokedOp]);

    await connector.pushCrudTransaction(tx);

    expect(tx.complete).toHaveBeenCalledTimes(1);
  });

  it("erreur réseau (non-FATAL) : re-throw pour retry, transaction NON complétée", async () => {
    sb.state.error = { message: "Failed to fetch", code: "503" };
    const connector = new SupabaseConnector();
    const tx = crudTx([revokedOp]);

    await expect(connector.pushCrudTransaction(tx)).rejects.toBeTruthy();

    // Pas de complete() : l'op reste en file et sera rejouée à la reconnexion.
    expect(tx.complete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mutation dupliquée / double écriture — garde d'idempotence (upsert par PK).
// ─────────────────────────────────────────────────────────────────────────────
describe("chaos 4 — mutation rejouée : idempotence par clé primaire", () => {
  it("rejouer la même op (même id) produit 2 upserts identiques sur `onConflict: id`", async () => {
    const connector = new SupabaseConnector();
    const op = crudOp({
      table: "accounts",
      op: "PUT",
      id: "acc-dup",
      opData: {
        name: "Caisse A",
        org_id: "org-1",
        owner_type: "GROUP",
        owner_id: "grp-1",
        currency: "XOF",
        status: "ACTIVE",
      },
    });

    await connector.pushCrudTransaction(crudTx([op]));
    // Rejeu : même id (cas d'un envoi retenté après un 4xx non-FATAL).
    await connector.pushCrudTransaction(crudTx([op]));

    expect(sb.calls).toHaveLength(2);
    // GARDE D'IDEMPOTENCE : l'upsert cible la PK `id`, donc un rejeu ne crée
    // pas de ligne supplémentaire (pas de double comptage côté base).
    expect(sb.calls.every((c) => c.opts?.onConflict === "id")).toBe(true);
    expect(sb.calls[0].record).toEqual(sb.calls[1].record);
    expect(sb.calls[0].record.id).toBe("acc-dup");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Offline long — après reconnexion, l'indicateur de sync ne reste pas bloqué.
// ─────────────────────────────────────────────────────────────────────────────
describe("chaos 5 — offline long : l'indicateur de sync se rétablit", () => {
  it("erreur pendant l'offline → reconnexion : syncError revient à null", async () => {
    ps.setStatus({
      connected: false,
      uploadError: { message: "Network request failed" },
      downloadError: null,
    });
    const { result } = renderHook(() => usePowerSyncIndicator());
    await waitFor(() =>
      expect(result.current.syncError).toBe("Network request failed"),
    );
    expect(result.current.online).toBe(false);

    // Reconnexion : nouveau statut sain → l'état n'est PAS collé à l'erreur.
    act(() => {
      ps.setStatus({
        connected: true,
        uploading: false,
        lastSyncedAt: new Date(),
        uploadError: null,
        downloadError: null,
      });
    });

    await waitFor(() => expect(result.current.syncError).toBeNull());
    expect(result.current.online).toBe(true);
  });

  it("un statut neutre (jamais connecté) n'invente pas d'erreur", async () => {
    ps.setStatus({ connected: false, uploadError: null, downloadError: null });
    const { result } = renderHook(() => usePowerSyncIndicator());
    await waitFor(() => expect(result.current.online).toBe(false));
    expect(result.current.syncError).toBeNull();
  });
});
