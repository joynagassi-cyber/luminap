// @vitest-environment jsdom
/**
 * PR13 — Application du gel de période au POINT D'ÉTRANGLEMENT d'écriture.
 *
 * Prouve que le refus n'est PAS cosmétique : quand une période est clôturée,
 * une écriture sur une transaction datée dans la période close est REJETÉE par
 * `dataLayer` (erreur typée `PERIOD_LOCKED`) et l'écriture SQL n'est PAS émise ;
 * une écriture hors période passe ; sans clôture tout passe (fail-open).
 *
 * Le mock PowerSync est stateful : il mémorise `org_settings` (clôture) et
 * journalise TOUTES les requêtes SQL, ce qui permet d'affirmer que l'INSERT /
 * UPDATE n'a pas été exécuté en cas de refus.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) : retirer la ligne
 * `await assertTransactionWritable(tx.date)` (et l'équivalent update/delete/
 * approve) de `dataLayer` ⇒ les tests « refusé + pas d'écriture » échouent.
 * Rendre `isDateLocked` toujours `false` ⇒ idem.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── PowerSync mock stateful ────────────────────────────────────────────────
const ps = vi.hoisted(() => ({
  settings: new Map<string, string>(), // `${org}:${key}` → value
  queries: [] as Array<{ sql: string; params: any[] }>,
  /** Réponse de `SELECT ... FROM transactions WHERE id = ?`. */
  txRows: [] as any[],
}));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({
    execute: async (sql: string, params: any[] = []) => {
      ps.queries.push({ sql, params });
      if (/org_settings/i.test(sql) && /INSERT/i.test(sql)) {
        ps.settings.set(`${params[0]}:${params[1]}`, params[2]);
        return { array: [], rowsAffected: 1 };
      }
      if (/org_settings/i.test(sql) && /DELETE/i.test(sql)) {
        ps.settings.delete(`${params[0]}:${params[1]}`);
        return { array: [], rowsAffected: 1 };
      }
      if (/org_settings/i.test(sql) && /SELECT/i.test(sql)) {
        const v = ps.settings.get(`${params[0]}:${params[1]}`);
        return { array: v === undefined ? [] : [{ value: v }], rowsAffected: 0 };
      }
      if (/FROM transactions WHERE id/i.test(sql)) {
        return { array: ps.txRows, rowsAffected: ps.txRows.length };
      }
      return { array: [], rowsAffected: 1 };
    },
    getOptional: async () => null,
  }),
  getPowerSyncConnector: () => ({}),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
  subscribeOrganization: () => () => {},
  setOrganizationId: vi.fn(),
  resetOrganizationId: vi.fn(),
}));

vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));

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

import {
  assertTransactionWritable,
  addTransactionPS,
  updateTransactionPS,
  deleteTransactionPS,
  approveTransactionPS,
} from "@/lib/dataLayer";
import { lockPeriod, clearPeriodLock, isPeriodLockedError } from "@/lib/periodLock";

/** Une écriture SQL vers `transactions` a-t-elle été émise ? */
function wroteToTransactions(): boolean {
  return ps.queries.some(
    (q) =>
      /transactions/i.test(q.sql) &&
      /(INSERT|UPDATE|DELETE)/i.test(q.sql) &&
      !/FROM transactions WHERE id/i.test(q.sql),
  );
}

beforeEach(async () => {
  ps.settings.clear();
  ps.queries = [];
  ps.txRows = [];
  await clearPeriodLock();
  ps.queries = [];
});

describe("PR13 — dataLayer refuse toute écriture sur une date gelée", () => {
  it("assertTransactionWritable rejette une date gelée, accepte une date ouverte", async () => {
    await lockPeriod("2026-10-31");
    await expect(assertTransactionWritable("2026-10-31")).rejects.toSatisfy(
      isPeriodLockedError,
    );
    await expect(assertTransactionWritable("2026-11-01")).resolves.toBeUndefined();
  });

  it("addTransactionPS sur date gelée ⇒ rejet typé ET AUCUN INSERT", async () => {
    await lockPeriod("2026-10-31");
    ps.queries = [];
    await expect(
      addTransactionPS({
        org_id: "org-1",
        type: "EXPENSE",
        amount: 1000,
        description: "Frais de culte",
        date: "2026-10-20",
        status: "PENDING",
        category_id: null,
        org_unit_id: null,
        compensates_for: null,
        comment: null,
        created_by_id: "u-1",
        approved_by_id: null,
        approved_at: null,
        event_id: null,
        source: "CAISSE",
        person_name: null,
        source_caisse_id: "main",
        versement_id: null,
        reversal_of_id: null,
      } as any),
    ).rejects.toSatisfy(isPeriodLockedError);
    expect(wroteToTransactions()).toBe(false);
  });

  it("addTransactionPS sur date ouverte ⇒ INSERT émis", async () => {
    await lockPeriod("2026-10-31");
    ps.queries = [];
    await addTransactionPS({
      org_id: "org-1",
      type: "INCOME",
      amount: 500,
      description: "Don",
      date: "2026-11-05",
      status: "APPROVED",
      category_id: null,
      org_unit_id: null,
      compensates_for: null,
      comment: null,
      created_by_id: "u-1",
      approved_by_id: null,
      approved_at: null,
      event_id: null,
      source: "CAISSE",
      person_name: null,
      source_caisse_id: "main",
      versement_id: null,
      reversal_of_id: null,
    } as any);
    expect(wroteToTransactions()).toBe(true);
  });

  it("updateTransactionPS sur transaction gelée ⇒ rejet, AUCUN UPDATE", async () => {
    await lockPeriod("2026-10-31");
    ps.txRows = [{ status: "PENDING", date: "2026-10-10" }];
    ps.queries = [];
    await expect(
      updateTransactionPS("tx-1", { description: "modif" }),
    ).rejects.toSatisfy(isPeriodLockedError);
    expect(wroteToTransactions()).toBe(false);
  });

  it("deleteTransactionPS sur transaction gelée ⇒ rejet, AUCUN DELETE", async () => {
    await lockPeriod("2026-10-31");
    ps.txRows = [{ status: "PENDING", date: "2026-10-10" }];
    ps.queries = [];
    await expect(deleteTransactionPS("tx-1")).rejects.toSatisfy(
      isPeriodLockedError,
    );
    expect(wroteToTransactions()).toBe(false);
  });

  it("approveTransactionPS sur transaction gelée ⇒ rejet, AUCUN UPDATE", async () => {
    await lockPeriod("2026-10-31");
    ps.txRows = [{ date: "2026-10-01" }];
    ps.queries = [];
    await expect(approveTransactionPS("tx-1", "u-1")).rejects.toSatisfy(
      isPeriodLockedError,
    );
    expect(wroteToTransactions()).toBe(false);
  });

  it("updateTransactionPS qui DÉPLACE vers une date gelée ⇒ rejet, AUCUN UPDATE", async () => {
    await lockPeriod("2026-10-31");
    // Transaction actuellement OUVERTE (novembre) : sans le second contrôle,
    // on pourrait l'éditer pour l'« entrer » dans la période close.
    ps.txRows = [{ status: "PENDING", date: "2026-11-10" }];
    ps.queries = [];
    await expect(
      updateTransactionPS("tx-1", { date: "2026-10-05" }),
    ).rejects.toSatisfy(isPeriodLockedError);
    expect(wroteToTransactions()).toBe(false);
  });

  it("aucune clôture ⇒ les écritures passent (fail-open)", async () => {
    ps.queries = [];
    await expect(assertTransactionWritable("2000-01-01")).resolves.toBeUndefined();
    await addTransactionPS({
      org_id: "org-1",
      type: "EXPENSE",
      amount: 100,
      description: "x",
      date: "2000-01-01",
      status: "PENDING",
      category_id: null,
      org_unit_id: null,
      compensates_for: null,
      comment: null,
      created_by_id: "u-1",
      approved_by_id: null,
      approved_at: null,
      event_id: null,
      source: "CAISSE",
      person_name: null,
      source_caisse_id: "main",
      versement_id: null,
      reversal_of_id: null,
    } as any);
    expect(wroteToTransactions()).toBe(true);
  });

  it("kill switch `period-lock` coupé ⇒ plus aucun blocage (fail-open d'exploitation)", async () => {
    await lockPeriod("2026-10-31");
    localStorage.setItem("lumina-flags", JSON.stringify({ "period-lock": false }));
    try {
      await expect(assertTransactionWritable("2026-10-01")).resolves.toBeUndefined();
    } finally {
      localStorage.removeItem("lumina-flags");
    }
  });
});
