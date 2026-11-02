// @vitest-environment jsdom
/**
 * PR13 — Gel de période : garde au niveau des SERVICES (cotisation, versement).
 *
 * Ces services écrivent des transactions datées SANS passer par
 * `addTransactionPS` ; le point d'étranglement `assertTransactionWritable` doit
 * donc y être appelé explicitement. Ce test prouve que :
 *   - quand la période est close, le service LÈVE (erreur typée) et N'ÉCRIT
 *     RIEN (ni cotisation/membre, ni ligne `versements`) — pas de demi-écriture ;
 *   - sans clôture, le service écrit normalement (fail-open).
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : retirer l'appel
 * `await assertTransactionWritable(...)` de `persistMarkCotisationPaid` (resp.
 * `createVersement`) ⇒ les tests « refusé + aucune écriture » échouent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// localStorage shim (node/jsdom sans Storage complet selon l'env).
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k: string) => store.get(k) ?? null,
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      removeItem: (k: string) => store.delete(k),
      setItem: (k: string, v: string) => store.set(k, String(v)),
    },
    configurable: true,
  });
}

const state = vi.hoisted(() => ({
  locked: false,
  writes: [] as Array<{ sql: string; params: any[] }>,
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  subscribeOrganization: () => () => {},
  setOrganizationId: vi.fn(),
  resetOrganizationId: vi.fn(),
}));

vi.mock("@/lib/dataLayer", async () => {
  const { PeriodLockedError } = await vi.importActual<typeof import("@/lib/periodLock")>(
    "@/lib/periodLock",
  );
  return {
    assertTransactionWritable: vi.fn(async (date: string) => {
      if (state.locked) throw new PeriodLockedError(date, "2026-10-31");
    }),
    executeWrite: vi.fn(async (sql: string, params: any[] = []) => {
      state.writes.push({ sql, params });
      return 1;
    }),
    updateCotisationPS: vi.fn(async () => {}),
    updateMemberPS: vi.fn(async () => {}),
  };
});

import { persistMarkCotisationPaid } from "@/lib/cotisation-service";
import { createVersement } from "@/lib/versement-service";
import { updateCotisationPS, updateMemberPS, executeWrite } from "@/lib/dataLayer";
import { isPeriodLockedError } from "@/lib/periodLock";

beforeEach(() => {
  state.locked = false;
  state.writes = [];
  vi.mocked(updateCotisationPS).mockClear();
  vi.mocked(updateMemberPS).mockClear();
  vi.mocked(executeWrite).mockClear();
});

function cotisationResult() {
  return {
    cotisationId: "cot-1",
    updatedCot: {
      statut: "PAYE",
      montantPaye: 1000,
      datePaiement: "2026-10-20",
    },
    updatedMembre: undefined,
    newTransaction: {
      id: "tx-new",
      orgId: "org-1",
      type: "INCOME" as const,
      amount: 1000,
      description: "Cotisation",
      date: "2026-10-20",
      status: "APPROVED" as const,
      categoryId: null,
      orgUnitId: null,
      eventId: null,
      source: "COTISATION" as const,
      personName: "Jean",
      compensatesFor: null,
      comment: "Cotisation",
      version: 1,
      sourceCaisseId: "main",
      versementId: null,
      reversalOfId: null,
      cotisationId: "cot-1",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
      createdById: "u-1",
      approvedById: "u-1",
      approvedAt: "2026-10-20T10:00:00Z",
    },
  } as any;
}

describe("PR13 — service cotisation : paiement sur période close", () => {
  it("refuse et n'écrit NI cotisation NI transaction", async () => {
    state.locked = true;
    await expect(persistMarkCotisationPaid(cotisationResult())).rejects.toSatisfy(
      isPeriodLockedError,
    );
    expect(updateCotisationPS).not.toHaveBeenCalled();
    expect(updateMemberPS).not.toHaveBeenCalled();
    expect(state.writes.some((w) => /INSERT INTO transactions/i.test(w.sql))).toBe(
      false,
    );
  });

  it("période ouverte : écrit la cotisation puis la transaction", async () => {
    await persistMarkCotisationPaid(cotisationResult());
    expect(updateCotisationPS).toHaveBeenCalledTimes(1);
    expect(state.writes.some((w) => /INSERT INTO transactions/i.test(w.sql))).toBe(
      true,
    );
  });
});

describe("PR13 — service versement : transfert sur période close", () => {
  it("refuse et n'écrit AUCUNE ligne versements/transactions", async () => {
    state.locked = true;
    await expect(
      createVersement({ sourceCaisseId: "caisse-1", amount: 5000 }),
    ).rejects.toSatisfy(isPeriodLockedError);
    expect(state.writes).toHaveLength(0);
  });

  it("période ouverte : écrit le versement et ses 2 transactions", async () => {
    const res = await createVersement({ sourceCaisseId: "caisse-1", amount: 5000 });
    expect(res.versementId).toBeTruthy();
    expect(state.writes.some((w) => /INSERT INTO versements/i.test(w.sql))).toBe(
      true,
    );
    expect(
      state.writes.filter((w) => /INSERT INTO transactions/i.test(w.sql)),
    ).toHaveLength(2);
  });
});
