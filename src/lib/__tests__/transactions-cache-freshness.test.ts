// @vitest-environment jsdom
/**
 * Fraîcheur de `useTransactions` — bug silencieux « l'UI ne se met pas à jour ».
 *
 * Deux verrous indépendants étaient en cause :
 *   1. `useTransactions` rendait le CACHE mémoire AVANT la donnée PowerSync
 *      vivante : après une création/édition, l'écran resservait la liste figée
 *      (TTL « cpu » 60 s) au lieu de la transaction tout juste écrite.
 *   2. `executeWrite` (point d'étranglement UNIQUE de toutes les écritures
 *      transactions) n'invalidait pas ce cache.
 *
 * Non-vacuité : remettre la lecture du cache AVANT la donnée vivante fait
 * échouer le 1er test ; retirer l'`invalidate` d'`executeWrite` fait échouer
 * le 2e.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ─── État partagé contrôlable par les tests ────────────────────────────────
const h = vi.hoisted(() => ({
  psRows: [] as any[],
  storeTxs: [] as any[],
  balanceRows: [] as any[],
}));

vi.mock("@powersync/react", () => ({
  useQuery: vi.fn(() => ({ data: h.psRows, isLoading: false })),
  usePowerSync: () => ({ execute: vi.fn(async () => ({ rowsAffected: 1 })) }),
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: vi.fn(async () => ({ array: h.balanceRows, rowsAffected: 1 })),
  }),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: () => ({ transactions: h.storeTxs }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  subscribeOrganization: () => () => {},
  resetOrganizationId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authService: { getState: () => ({}) } }));

vi.mock("@/lib/featureFlags", () => ({
  isFeatureEnabled: () => true,
}));

import { useTransactions, executeWrite, markPowerSyncReady } from "@/lib/dataLayer";
import { getAccountBalance } from "@/lib/account";
import { set as cacheSet, clear as cacheClear } from "@/lib/cache";

beforeEach(() => {
  cacheClear();
  markPowerSyncReady();
  h.psRows = [];
  h.storeTxs = [];
  h.balanceRows = [];
});

describe("useTransactions — la donnée vivante prime sur le cache", () => {
  it("ressert la donnée PowerSync fraîche même si le cache contient l'ancienne liste", () => {
    const stale = [{ id: "old", amount: 100 }];
    cacheSet("txs:org-1", stale, { tier: "cpu" });
    h.psRows = [{ id: "new", amount: 200 }];

    const { result } = renderHook(() => useTransactions());

    expect(result.current.data).toEqual([{ id: "new", amount: 200 }]);
    expect(result.current.source).toBe("powersync");
  });

  it("replie sur le cache uniquement quand PowerSync ne renvoie rien", () => {
    const cached = [{ id: "cached", amount: 100 }];
    cacheSet("txs:org-1", cached, { tier: "cpu" });
    h.psRows = [];

    const { result } = renderHook(() => useTransactions());

    expect(result.current.data).toEqual(cached);
    expect(result.current.source).toBe("cached");
  });
});

describe("executeWrite — invalide le cache des transactions", () => {
  it("une écriture sur `transactions` purge le cache (plus de liste périmée servie)", async () => {
    // Cache périmé + PowerSync pas encore reflété l'écriture (psData vide) :
    // sans invalidation, `useTransactions` ressert l'ancienne liste.
    cacheSet("txs:org-1", [{ id: "old" }], { tier: "cpu" });
    h.psRows = [];
    h.storeTxs = [{ id: "new" }];

    await executeWrite("INSERT INTO transactions (id) VALUES (?)", ["x"]);

    const { result } = renderHook(() => useTransactions());
    expect(result.current.data).toEqual([{ id: "new" }]);
    expect(result.current.source).toBe("indexeddb");
  });

  it("une écriture sur une AUTRE table ne touche pas le cache des transactions", async () => {
    cacheSet("txs:org-1", [{ id: "keep" }], { tier: "cpu" });

    await executeWrite("UPDATE events SET name = ? WHERE id = ?", ["n", "e"]);

    h.psRows = [];
    const { result } = renderHook(() => useTransactions());
    expect(result.current.data).toEqual([{ id: "keep" }]);
    expect(result.current.source).toBe("cached");
  });
});

describe("executeWrite — invalide aussi le cache des soldes", () => {
  it("une écriture sur `transactions` force le recalcul du solde", async () => {
    h.balanceRows = [{ type: "INCOME", amount: 100 }];
    expect(await getAccountBalance("c1")).toBe(100);

    // Le solde est mis en cache : une variation de la source ne suffit pas…
    h.balanceRows = [{ type: "INCOME", amount: 200 }];
    expect(await getAccountBalance("c1")).toBe(100);

    // …mais une écriture sur `transactions` invalide ce cache.
    await executeWrite("INSERT INTO transactions (id) VALUES (?)", ["x"]);
    expect(await getAccountBalance("c1")).toBe(200);
  });

  it("une écriture sur une autre table ne purge pas le solde", async () => {
    h.balanceRows = [{ type: "INCOME", amount: 100 }];
    expect(await getAccountBalance("c1")).toBe(100);

    await executeWrite("UPDATE events SET name = ? WHERE id = ?", ["n", "e"]);

    h.balanceRows = [{ type: "INCOME", amount: 200 }];
    expect(await getAccountBalance("c1")).toBe(100);
  });
});
